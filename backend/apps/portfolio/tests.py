import io
import os
import shutil
import tempfile
from datetime import timedelta
from unittest import mock

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.exceptions import ValidationError
from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase, override_settings
from django.utils import timezone
from PIL import Image

from apps.core.models import Category
from apps.core.testing import APIBase
from apps.listings.models import MediaImage
from apps.remakers.models import RemakerProduct, ReMakers

from . import views
from .models import DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH, PortfolioEntry

TMP = tempfile.mkdtemp(prefix="reorbit-portfolio-")
STORY = "A wobbly dining chair with a broken back, rebuilt with new cane weave."


def photo(name="p.jpg", color=(180, 90, 40), fmt="JPEG", size=(80, 60)):
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format=fmt)
    ctype = "image/png" if fmt == "PNG" else "image/jpeg"
    return SimpleUploadedFile(name, buf.getvalue(), content_type=ctype)


@override_settings(MEDIA_ROOT=TMP)
class PortfolioBase(APIBase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TMP, ignore_errors=True)

    def setUp(self):
        super().setUp()
        self.maker = self.make_remaker()
        self.other = self.make_remaker(email="other@example.com", username="Other Maker")
        self.cat = Category.objects.create(name="Furniture", slug="furniture")
        self.item_only = Category.objects.create(
            name="Used phones", slug="used-phones", applies_to=Category.AppliesTo.ITEM
        )

    # -- helpers --------------------------------------------------------- #
    def body(self, **over):
        data = {
            "title": "Cane-back accent chair",
            "category": self.cat.public_id,
            "description": STORY,
            "before": photo("b.jpg"),
            "after": photo("a.jpg", color=(20, 120, 60)),
        }
        data.update(over)
        return {k: v for k, v in data.items() if v is not None}

    def upload(self, as_=None, **over):
        as_ = as_ or self.maker
        return self.client.post(
            "/api/portfolio/me/", self.body(**over), format="multipart", **self._headers(as_)
        )

    def make_work(self, as_=None, **over):
        r = self.upload(as_, **over)
        self.assertEqual(r.status_code, 201, r.data)
        return r.data["data"]["work"]

    def make_product(self, owner=None, status=RemakerProduct.Status.LISTED, **kw):
        return RemakerProduct.objects.create(
            remaker=owner or self.maker, category=self.cat, title=kw.pop("title", "Teak chair"),
            price=2500, stock=3, status=status, **kw,
        )

    def patch_multipart(self, work_id, data, as_=None):
        return self.client.patch(
            f"/api/portfolio/me/{work_id}/", data, format="multipart", **self._headers(as_ or self.maker)
        )


class CreateTests(PortfolioBase):
    def test_add_a_work(self):
        work = self.make_work()
        self.assertRegex(work["id"], r"^PF-\d+$")
        self.assertEqual(work["title"], "Cane-back accent chair")
        self.assertEqual(work["category"]["name"], "Furniture")
        self.assertTrue(work["before"].endswith((".jpg", ".png", ".webp")))
        self.assertNotEqual(work["before"], work["after"])
        self.assertIsNone(work["linked_product"])
        entry = PortfolioEntry.objects.get(public_id=work["id"])
        self.assertEqual(entry.remaker, self.maker)
        roles = sorted(entry.images.values_list("image_type", flat=True))
        self.assertEqual(roles, ["After", "Before"])

    def test_both_photos_are_required(self):
        for missing in ("before", "after"):
            r = self.upload(**{missing: None})
            self.assertEqual(r.status_code, 400)
            self.assertIn(missing, r.data["errors"])
        self.assertEqual(PortfolioEntry.objects.count(), 0)

    def test_text_rules(self):
        cases = {
            "title": ["ab", "x" * 71, ""],
            "description": ["too short", "y" * 501],
            "category": ["", "CAT-9999999", self.item_only.public_id],
        }
        for field, values in cases.items():
            for value in values:
                r = self.upload(**{field: value})
                self.assertEqual(r.status_code, 400, (field, value))
                self.assertIn(field, r.data["errors"])
        self.assertEqual(PortfolioEntry.objects.count(), 0)

    def test_retired_category_is_refused(self):
        self.cat.status = Category.Status.INACTIVE
        self.cat.save()
        self.assertEqual(self.upload().status_code, 400)

    def test_bad_image_is_refused(self):
        junk = SimpleUploadedFile("x.jpg", b"not an image", content_type="image/jpeg")
        r = self.upload(before=junk)
        self.assertEqual(r.status_code, 400)
        self.assertIn("before", r.data["errors"])

    def test_title_whitespace_is_tidied(self):
        work = self.make_work(title="  Teak   door    table ")
        self.assertEqual(work["title"], "Teak door table")

    def test_link_own_product_only(self):
        mine = self.make_product()
        theirs = self.make_product(owner=self.other, title="Not mine")
        ok_work = self.make_work(linked_product=mine.public_id)
        self.assertEqual(ok_work["linked_product"]["id"], mine.public_id)
        bad = self.upload(linked_product=theirs.public_id)
        self.assertEqual(bad.status_code, 400)
        self.assertIn("linked_product", bad.data["errors"])
        gone = self.make_product(title="Gone")
        gone.deleted_at = timezone.now()
        gone.save()
        self.assertEqual(self.upload(linked_product=gone.public_id).status_code, 400)

    def test_limit_per_remaker(self):
        old = views.MAX_WORKS
        views.MAX_WORKS = 2
        try:
            self.make_work()
            self.make_work(title="Second work")
            r = self.upload(title="Third work")
            self.assertEqual(r.status_code, 409)
        finally:
            views.MAX_WORKS = old


class ReadTests(PortfolioBase):
    def test_list_is_mine_and_newest_first(self):
        first = self.make_work(title="First work")
        second = self.make_work(title="Second work")
        self.make_work(as_=self.other, title="Other maker work")
        r = self.get("/api/portfolio/me/", as_=self.maker)
        self.assertEqual(r.status_code, 200)
        ids = [w["id"] for w in r.data["data"]["works"]]
        self.assertEqual(ids, [second["id"], first["id"]])

    def test_cannot_touch_someone_elses_work(self):
        work = self.make_work(as_=self.other)
        url = f"/api/portfolio/me/{work['id']}/"
        self.assertEqual(self.get(url, as_=self.maker).status_code, 404)
        self.assertEqual(self.patch(url, {"title": "Hijack title"}, as_=self.maker).status_code, 404)
        self.assertEqual(self.delete(url, as_=self.maker).status_code, 404)
        self.assertEqual(PortfolioEntry.objects.get(public_id=work["id"]).title, "Cane-back accent chair")

    def test_roles_and_login(self):
        self.assertEqual(self.client.get("/api/portfolio/me/").status_code, 401)
        user = self.make_user()
        self.assertEqual(self.get("/api/portfolio/me/", as_=user).status_code, 403)
        self.assertEqual(self.upload(as_=user).status_code, 403)

    def test_suspended_can_read_not_change(self):
        work = self.make_work()
        self.maker.status = ReMakers.Status.SUSPENDED
        self.maker.save()
        self.assertEqual(self.get("/api/portfolio/me/", as_=self.maker).status_code, 200)
        self.assertEqual(self.upload().status_code, 403)
        self.assertEqual(self.patch(f"/api/portfolio/me/{work['id']}/", {"title": "New title"}, as_=self.maker).status_code, 403)
        self.assertEqual(self.delete(f"/api/portfolio/me/{work['id']}/", as_=self.maker).status_code, 403)

    def test_blocked_is_locked_out(self):
        self.maker.status = ReMakers.Status.BLOCKED
        self.maker.save()
        self.assertEqual(self.get("/api/portfolio/me/", as_=self.maker).status_code, 403)


class EditTests(PortfolioBase):
    def test_edit_text_and_link_and_unlink(self):
        work = self.make_work()
        product = self.make_product()
        r = self.patch(f"/api/portfolio/me/{work['id']}/",
                       {"title": "Cane chair, restored", "linked_product": product.public_id}, as_=self.maker)
        self.assertEqual(r.status_code, 200, r.data)
        got = r.data["data"]["work"]
        self.assertEqual(got["title"], "Cane chair, restored")
        self.assertEqual(got["linked_product"]["id"], product.public_id)
        self.assertEqual(got["description"], STORY)  # untouched fields stay
        r = self.patch(f"/api/portfolio/me/{work['id']}/", {"linked_product": ""}, as_=self.maker)
        self.assertIsNone(r.data["data"]["work"]["linked_product"])

    def test_edit_validates(self):
        work = self.make_work()
        url = f"/api/portfolio/me/{work['id']}/"
        for body in ({"title": "x"}, {"description": "short"}, {"category": self.item_only.public_id},
                     {"linked_product": "RPR-99999"}):
            r = self.patch(url, body, as_=self.maker)
            self.assertEqual(r.status_code, 400, body)

    def test_unchanged_retired_category_still_saves(self):
        work = self.make_work()
        self.cat.status = Category.Status.INACTIVE
        self.cat.save()
        r = self.patch(f"/api/portfolio/me/{work['id']}/",
                       {"title": "Renamed work", "category": self.cat.public_id}, as_=self.maker)
        self.assertEqual(r.status_code, 200, r.data)

    def test_replace_a_photo_removes_the_old_file(self):
        work = self.make_work()
        entry = PortfolioEntry.objects.get(public_id=work["id"])
        old = entry.images.get(image_type="After")
        old_name, storage = old.image.name, old.image.storage
        self.assertTrue(storage.exists(old_name))
        with self.captureOnCommitCallbacks(execute=True):
            r = self.patch_multipart(work["id"], {"after": photo("new.png", fmt="PNG")})
        self.assertEqual(r.status_code, 200, r.data)
        new = entry.images.get(image_type="After")
        self.assertNotEqual(new.image.name, old_name)
        self.assertFalse(storage.exists(old_name))
        self.assertEqual(entry.images.count(), 2)  # still exactly one before and one after
        self.assertTrue(r.data["data"]["work"]["after"].endswith(new.image.name.split("/")[-1]))

    def test_bad_replacement_photo_changes_nothing(self):
        work = self.make_work()
        junk = SimpleUploadedFile("x.jpg", b"nope", content_type="image/jpeg")
        r = self.patch_multipart(work["id"], {"title": "Should not apply", "before": junk})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(PortfolioEntry.objects.get(public_id=work["id"]).title, "Cane-back accent chair")


class DeleteTests(PortfolioBase):
    def test_delete_then_undo(self):
        work = self.make_work()
        url = f"/api/portfolio/me/{work['id']}/"
        r = self.delete(url, as_=self.maker)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["data"]["work"]["id"], work["id"])
        self.assertEqual(self.get("/api/portfolio/me/", as_=self.maker).data["data"]["works"], [])
        self.assertEqual(self.get(url, as_=self.maker).status_code, 404)
        r = self.post(url + "restore/", as_=self.maker)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(len(self.get("/api/portfolio/me/", as_=self.maker).data["data"]["works"]), 1)
        # photos survived the round trip
        self.assertEqual(MediaImage.objects.filter(portfolio__public_id=work["id"]).count(), 2)

    def test_restore_window_and_owner(self):
        work = self.make_work()
        url = f"/api/portfolio/me/{work['id']}/"
        self.delete(url, as_=self.maker)
        self.assertEqual(self.post(url + "restore/", as_=self.other).status_code, 404)
        PortfolioEntry.objects.filter(public_id=work["id"]).update(deleted_at=timezone.now() - timedelta(days=8))
        self.assertEqual(self.post(url + "restore/", as_=self.maker).status_code, 404)
        self.assertEqual(self.post(f"/api/portfolio/me/{work['id']}/restore/", as_=self.maker).status_code, 404)

    def test_restoring_a_live_work_is_a_404(self):
        work = self.make_work()
        self.assertEqual(self.post(f"/api/portfolio/me/{work['id']}/restore/", as_=self.maker).status_code, 404)

    def test_deleting_a_linked_product_hides_the_link(self):
        product = self.make_product()
        work = self.make_work(linked_product=product.public_id)
        product.deleted_at = timezone.now()
        product.save()
        got = self.get(f"/api/portfolio/me/{work['id']}/", as_=self.maker).data["data"]["work"]
        self.assertIsNone(got["linked_product"])

    def test_purge_removes_old_deleted_works_and_files(self):
        work = self.make_work()
        keep = self.make_work(title="Still here")
        entry = PortfolioEntry.objects.get(public_id=work["id"])
        images = list(entry.images.all())
        names = [(i.image.storage, i.image.name) for i in images]
        PortfolioEntry.objects.filter(pk=entry.pk).update(deleted_at=timezone.now() - timedelta(days=8))
        with self.captureOnCommitCallbacks(execute=True):
            call_command("purge_portfolio", verbosity=0)
        self.assertFalse(PortfolioEntry.objects.filter(pk=entry.pk).exists())
        self.assertEqual(MediaImage.objects.filter(pk__in=[i.pk for i in images]).count(), 0)
        for storage, name in names:
            self.assertFalse(storage.exists(name))
        self.assertTrue(PortfolioEntry.objects.filter(public_id=keep["id"]).exists())


class DatabaseRuleTests(PortfolioBase):
    def test_one_before_and_one_after_per_work(self):
        work = self.make_work()
        entry = PortfolioEntry.objects.get(public_id=work["id"])
        with self.assertRaises(IntegrityError), transaction.atomic():
            MediaImage.objects.create(portfolio=entry, image="x.jpg", image_type="Before")

    def test_an_image_has_exactly_one_parent(self):
        work = self.make_work()
        entry = PortfolioEntry.objects.get(public_id=work["id"])
        product = self.make_product()
        with self.assertRaises(IntegrityError), transaction.atomic():
            MediaImage.objects.create(portfolio=entry, remaker_product=product, image="x.jpg", image_type="Gallery")
        with self.assertRaises(IntegrityError), transaction.atomic():
            MediaImage.objects.create(image="x.jpg", image_type="Gallery")


class PublicTests(PortfolioBase):
    def url(self, remaker=None):
        return f"/api/portfolio/public/{(remaker or self.maker).public_id}/"

    def test_anyone_sees_public_works(self):
        self.make_work(title="Public work")
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 200)
        works = r.data["data"]["works"]
        self.assertEqual([w["title"] for w in works], ["Public work"])
        self.assertIn("before", works[0])
        self.assertNotIn("visibility", works[0])

    def test_private_and_deleted_works_are_hidden(self):
        self.make_work(title="Shown")
        self.make_work(title="Private one", visibility="Private")
        gone = self.make_work(title="Deleted one")
        self.delete(f"/api/portfolio/me/{gone['id']}/", as_=self.maker)
        titles = [w["title"] for w in self.client.get(self.url()).data["data"]["works"]]
        self.assertEqual(titles, ["Shown"])

    def test_only_active_remakers_have_a_public_portfolio(self):
        self.make_work()
        for status in (ReMakers.Status.SUSPENDED, ReMakers.Status.BLOCKED, ReMakers.Status.DELETED):
            self.maker.status = status
            self.maker.save()
            self.assertEqual(self.client.get(self.url()).status_code, 404, status)
        self.assertEqual(self.client.get("/api/portfolio/public/RMK-0/").status_code, 404)

    def test_linked_product_only_while_live(self):
        product = self.make_product()
        self.make_work(linked_product=product.public_id)
        got = self.client.get(self.url()).data["data"]["works"][0]
        self.assertEqual(got["linked_product"]["id"], product.public_id)
        product.status = RemakerProduct.Status.INACTIVE
        product.save()
        got = self.client.get(self.url()).data["data"]["works"][0]
        self.assertIsNone(got["linked_product"])

    def test_no_private_data_leaks(self):
        self.make_work()
        text = str(self.client.get(self.url()).data)
        self.assertNotIn(self.maker.email, text)


class AdminTests(PortfolioBase):
    def test_admin_with_remakers_module_sees_all_works(self):
        self.make_work(title="Public work")
        self.make_work(title="Private work", visibility="Private")
        admin = self.make_admin(modules={"remakers": "view"})
        r = self.get(f"/api/portfolio/admin/{self.maker.public_id}/", as_=admin)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(sorted(w["title"] for w in r.data["data"]["works"]), ["Private work", "Public work"])
        self.assertIn("visibility", r.data["data"]["works"][0])

    def test_admin_can_see_a_blocked_remakers_work(self):
        self.make_work()
        self.maker.status = ReMakers.Status.BLOCKED
        self.maker.save()
        admin = self.make_admin(modules={"remakers": "view"})
        self.assertEqual(len(self.get(f"/api/portfolio/admin/{self.maker.public_id}/", as_=admin).data["data"]["works"]), 1)

    def test_admin_without_the_module_is_refused(self):
        admin = self.make_admin(email="a2@example.com", modules={"orders": "edit"})
        self.assertEqual(self.get(f"/api/portfolio/admin/{self.maker.public_id}/", as_=admin).status_code, 403)

    def test_admin_is_read_only(self):
        admin = self.make_admin(modules={"remakers": "edit"})
        url = f"/api/portfolio/admin/{self.maker.public_id}/"
        self.assertEqual(self.post(url, {}, as_=admin).status_code, 405)
        self.assertEqual(self.delete(url, as_=admin).status_code, 405)

    def test_users_and_remakers_cannot_use_admin_endpoint(self):
        url = f"/api/portfolio/admin/{self.maker.public_id}/"
        self.assertEqual(self.get(url, as_=self.maker).status_code, 403)
        self.assertEqual(self.get(url, as_=self.make_user()).status_code, 403)
        self.assertEqual(self.client.get(url).status_code, 401)

    def test_unknown_remaker(self):
        admin = self.make_admin(modules={"remakers": "view"})
        self.assertEqual(self.get("/api/portfolio/admin/RMK-0/", as_=admin).status_code, 404)


def media_files():
    """Every file currently stored under MEDIA_ROOT."""
    found = []
    for folder, _dirs, names in os.walk(TMP):
        found += [os.path.join(folder, n) for n in names]
    return sorted(found)


class LimitTests(PortfolioBase):
    """The form, the API and the database all use the same limits."""

    def test_api_limits_are_the_model_limits(self):
        self.assertEqual(views.TITLE_MAX, TITLE_MAX_LENGTH)
        self.assertEqual(views.DESC_MAX, DESCRIPTION_MAX_LENGTH)
        self.assertEqual(PortfolioEntry._meta.get_field("title").max_length, 70)

    def test_exact_boundaries(self):
        self.assertEqual(self.upload(title="t" * TITLE_MAX_LENGTH).status_code, 201)
        self.assertEqual(self.upload(title="t" * (TITLE_MAX_LENGTH + 1)).status_code, 400)
        self.assertEqual(self.upload(description="d" * DESCRIPTION_MAX_LENGTH).status_code, 201)
        self.assertEqual(self.upload(description="d" * (DESCRIPTION_MAX_LENGTH + 1)).status_code, 400)
        self.assertEqual(self.upload(description="d" * 20).status_code, 201)
        self.assertEqual(self.upload(description="d" * 19).status_code, 400)

    def test_model_validation_matches(self):
        entry = PortfolioEntry(remaker=self.maker, title="t" * 71, description=STORY, category=self.cat)
        with self.assertRaises(ValidationError):
            entry.full_clean()

    def test_database_refuses_a_too_long_story(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            PortfolioEntry.objects.create(
                remaker=self.maker, title="Ok title", category=self.cat,
                description="d" * (DESCRIPTION_MAX_LENGTH + 1),
            )


class PhotoFormatTests(PortfolioBase):
    def test_accepted_formats(self):
        for name, fmt in (("a.jpg", "JPEG"), ("a.png", "PNG"), ("a.webp", "WEBP")):
            file = photo(name, fmt=fmt)
            file.content_type = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}[fmt]
            self.assertEqual(self.upload(before=file).status_code, 201, fmt)

    def test_refused_formats_and_size(self):
        start = media_files()
        for name, fmt in (("a.gif", "GIF"), ("a.bmp", "BMP")):
            buf = io.BytesIO()
            Image.new("RGB", (20, 20), (1, 2, 3)).save(buf, format=fmt)
            file = SimpleUploadedFile(name, buf.getvalue(), content_type="image/jpeg")
            r = self.upload(before=file)
            self.assertEqual(r.status_code, 400, fmt)
            self.assertIn("before", r.data["errors"])
        big = SimpleUploadedFile("big.jpg", b"\xff\xd8" + b"0" * (5 * 1024 * 1024 + 1), content_type="image/jpeg")
        r = self.upload(after=big)
        self.assertEqual(r.status_code, 400)
        self.assertIn("after", r.data["errors"])
        self.assertEqual(PortfolioEntry.objects.count(), 0)
        self.assertEqual(media_files(), start)

    def test_a_renamed_non_image_is_refused(self):
        fake = SimpleUploadedFile("fake.png", b"<script>alert(1)</script>", content_type="image/png")
        self.assertEqual(self.upload(before=fake).status_code, 400)


class FailureCleanupTests(PortfolioBase):
    """A request that fails half way must leave no rows and no stray files."""

    def setUp(self):
        super().setUp()
        self.start = media_files()

    def test_second_photo_failing_leaves_nothing(self):
        real, calls = views.process_image, []

        def flaky(file, **kwargs):
            calls.append(1)
            if len(calls) == 2:
                raise RuntimeError("disk full")
            return real(file, **kwargs)

        with mock.patch.object(views, "process_image", flaky), self.assertRaises(RuntimeError):
            self.upload()
        self.assertEqual(PortfolioEntry.objects.count(), 0)
        self.assertEqual(MediaImage.objects.count(), 0)
        self.assertEqual(media_files(), self.start)

    def test_failure_after_both_photos_saved_leaves_nothing(self):
        with mock.patch.object(views, "audit", side_effect=RuntimeError("boom")), self.assertRaises(RuntimeError):
            self.upload()
        self.assertEqual(PortfolioEntry.objects.count(), 0)
        self.assertEqual(MediaImage.objects.count(), 0)
        self.assertEqual(media_files(), self.start)

    def test_edit_failing_keeps_the_old_photo_and_drops_the_new_one(self):
        work = self.make_work()
        entry = PortfolioEntry.objects.get(public_id=work["id"])
        old = entry.images.get(image_type="After")
        old_name, storage = old.image.name, old.image.storage
        files_before = media_files()
        with mock.patch.object(views, "audit", side_effect=RuntimeError("boom")), self.assertRaises(RuntimeError):
            with self.captureOnCommitCallbacks(execute=True):
                self.patch_multipart(work["id"], {"title": "New title here", "after": photo("n.png", fmt="PNG")})
        self.assertEqual(entry.images.get(image_type="After").image.name, old_name)
        self.assertTrue(storage.exists(old_name))
        self.assertEqual(media_files(), files_before)  # the new file did not stay behind
        self.assertEqual(PortfolioEntry.objects.get(pk=entry.pk).title, "Cane-back accent chair")

    def test_edit_succeeding_swaps_exactly_one_file(self):
        work = self.make_work()
        files_before = media_files()
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(self.patch_multipart(work["id"], {"before": photo("n.jpg")}).status_code, 200)
        after = media_files()
        self.assertEqual(len(after), len(files_before))
        self.assertEqual(len(set(after) - set(files_before)), 1)

    def test_validation_failure_writes_no_files(self):
        self.assertEqual(self.upload(title="x").status_code, 400)
        self.assertEqual(media_files(), self.start)

    def test_delete_keeps_files_until_purge(self):
        work = self.make_work()
        files = media_files()
        self.delete(f"/api/portfolio/me/{work['id']}/", as_=self.maker)
        self.assertEqual(media_files(), files)


class VisibilityAndFeaturedTests(PortfolioBase):
    def test_editing_text_never_resets_visibility(self):
        work = self.make_work(visibility="Private")
        r = self.patch_multipart(work["id"], {
            "title": "Edited title", "category": self.cat.public_id,
            "description": STORY, "linked_product": "",
        })
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["data"]["work"]["visibility"], "Private")

    def test_visibility_can_be_changed_through_the_api(self):
        work = self.make_work()
        r = self.patch(f"/api/portfolio/me/{work['id']}/", {"visibility": "Private"}, as_=self.maker)
        self.assertEqual(r.data["data"]["work"]["visibility"], "Private")
        self.assertEqual(self.patch(f"/api/portfolio/me/{work['id']}/", {"visibility": "Secret"}, as_=self.maker).status_code, 400)

    def test_featured_is_not_settable_or_exposed(self):
        work = self.make_work(is_featured="true")
        self.assertNotIn("is_featured", work)
        self.assertFalse(PortfolioEntry.objects.get(public_id=work["id"]).is_featured)
        self.patch(f"/api/portfolio/me/{work['id']}/", {"is_featured": True}, as_=self.maker)
        self.assertFalse(PortfolioEntry.objects.get(public_id=work["id"]).is_featured)


class MigrationUpgradeTests(TransactionTestCase):
    """Existing databases: the new migrations apply on top of existing data and reverse."""

    OLD = [("listings", "0003_item_quantity_gte_0"), ("portfolio", None)]

    def test_upgrade_keeps_existing_images_and_is_reversible(self):
        executor = MigrationExecutor(connection)
        executor.migrate(self.OLD)
        old = executor.loader.project_state([self.OLD[0]]).apps

        Category = old.get_model("core", "Category")
        Remakers = old.get_model("remakers", "ReMakers")
        Product = old.get_model("remakers", "RemakerProduct")
        Media = old.get_model("listings", "MediaImage")
        cat = Category.objects.create(name="Furniture", slug="furniture", public_id="CAT-9001")
        maker = Remakers.objects.create(full_name="M", username="m1", email="m1@example.com", public_id="RMK-9001")
        product = Product.objects.create(remaker=maker, category=cat, title="Chair", price=10, stock=1, public_id="RPR-9001")
        Media.objects.create(remaker_product=product, image="listings/old.jpg", image_type="Cover")

        executor = MigrationExecutor(connection)
        leaves = executor.loader.graph.leaf_nodes()
        executor.migrate(leaves)
        new = executor.loader.project_state(leaves).apps
        Media = new.get_model("listings", "MediaImage")
        Entry = new.get_model("portfolio", "PortfolioEntry")
        self.assertEqual(Media.objects.filter(remaker_product__public_id="RPR-9001").count(), 1)

        entry = Entry.objects.create(remaker_id=maker.pk, title="Work", description="d" * 30, public_id="PF-9001")
        Media.objects.create(portfolio=entry, image="listings/b.jpg", image_type="Before")
        with self.assertRaises(IntegrityError), transaction.atomic():
            Media.objects.create(portfolio=entry, image="listings/b2.jpg", image_type="Before")
        with self.assertRaises(IntegrityError), transaction.atomic():
            Media.objects.create(image="listings/orphan.jpg", image_type="Gallery")

        # and back again: the old state still has the old data
        executor = MigrationExecutor(connection)
        executor.migrate(self.OLD)
        old = executor.loader.project_state([self.OLD[0]]).apps
        self.assertEqual(old.get_model("listings", "MediaImage").objects.count(), 1)

        # leave the database fully migrated for the tests that follow
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
