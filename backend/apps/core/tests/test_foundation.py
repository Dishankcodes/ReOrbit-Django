from io import BytesIO

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from PIL import Image

from apps.core import events
from apps.core.exceptions import api_exception_handler
from apps.core.ids import next_public_id
from apps.core.models import AuditLog, Category, Notification, PlatformSettings, SavedAddress
from apps.core.pricing import cod_block_reason, delivery_charge, platform_fee
from apps.core.services import audit, mark_read, notify
from apps.core.testing import APIBase
from apps.core.validators import validate_image


class PublicIdTests(APIBase):
    def test_sequence_counts_up_per_prefix(self):
        self.assertEqual(next_public_id("ZZZ"), "ZZZ-1001")
        self.assertEqual(next_public_id("ZZZ"), "ZZZ-1002")
        self.assertEqual(next_public_id("YYY"), "YYY-1001")

    def test_models_get_prefixed_ids(self):
        self.assertTrue(self.make_user().public_id.startswith("USR-"))
        self.assertTrue(self.make_remaker().public_id.startswith("RMK-"))
        self.assertTrue(self.make_admin().public_id.startswith("ADM-"))
        self.assertTrue(Category.objects.create(name="Chairs", slug="chairs").public_id.startswith("CAT-"))

    def test_public_id_never_changes(self):
        user = self.make_user()
        first = user.public_id
        user.full_name = "Renamed"
        user.save()
        user.refresh_from_db()
        self.assertEqual(user.public_id, first)


class SettingsAndPricingTests(APIBase):
    def test_singleton(self):
        a = PlatformSettings.load()
        b = PlatformSettings.load()
        self.assertEqual(a.pk, 1)
        self.assertEqual(PlatformSettings.objects.count(), 1)
        PlatformSettings(platform_fee_pct=5).save()
        self.assertEqual(PlatformSettings.objects.count(), 1)
        self.assertEqual(float(PlatformSettings.load().platform_fee_pct), 5.0)
        self.assertEqual(a.pk, b.pk)

    def test_public_endpoint_is_open_and_camel_case(self):
        r = self.get("/api/core/settings/")
        self.assertEqual(r.status_code, 200)
        data = r.data["data"]
        for key in ("platformFeePct", "itemDelivery", "productDelivery", "freeDeliveryFrom", "codEnabled", "codLimit"):
            self.assertIn(key, data)

    def test_fee_is_paid_by_buyer_on_member_orders_only(self):
        s = PlatformSettings.load()
        self.assertEqual(platform_fee(1000, "user", s), 30)
        self.assertEqual(platform_fee(1000, "remaker", s), 30)
        self.assertEqual(platform_fee(1000, "platform", s), 0)
        self.assertEqual(platform_fee(1050, "user", s), 32)  # 31.5 rounds half up

    def test_delivery_rules(self):
        s = PlatformSettings.load()
        self.assertEqual(delivery_charge("user", 500, platform_pickup=False, settings=s), 0)
        self.assertEqual(delivery_charge("user", 500, platform_pickup=True, settings=s), s.item_delivery)
        self.assertEqual(delivery_charge("remaker", 1499, settings=s), s.product_delivery)
        self.assertEqual(delivery_charge("remaker", 1500, settings=s), 0)

    def test_cod_rules(self):
        s = PlatformSettings.load()
        self.assertEqual(cod_block_reason(20000, s), "")
        self.assertIn("up to", cod_block_reason(20001, s))
        s.cod_enabled = False
        self.assertIn("switched off", cod_block_reason(1, s))


class CategoryTests(APIBase):
    def test_public_list_hides_inactive(self):
        Category.objects.create(name="Chairs", slug="chairs")
        Category.objects.create(name="Old", slug="old", status="Inactive")
        r = self.get("/api/core/categories/")
        self.assertEqual([c["name"] for c in r.data["data"]], ["Chairs"])

    def test_name_unique_any_case(self):
        Category.objects.create(name="Chairs", slug="chairs")
        with self.assertRaises(IntegrityError), transaction.atomic():
            Category.objects.create(name="CHAIRS", slug="chairs-2")


class SavedAddressTests(APIBase):
    FIELDS = dict(
        recipient_name="A", phone="9876543210", address_line1="1 Road",
        city="Pune", state="MH", pincode="411001",
    )

    def test_exactly_one_owner(self):
        user, remaker = self.make_user(), self.make_remaker()
        with self.assertRaises(IntegrityError), transaction.atomic():
            SavedAddress.objects.create(**self.FIELDS)  # no owner
        with self.assertRaises(IntegrityError), transaction.atomic():
            SavedAddress.objects.create(user=user, remaker=remaker, **self.FIELDS)  # two owners
        self.assertTrue(SavedAddress.objects.create(user=user, **self.FIELDS).public_id.startswith("ADR-"))

    def test_one_default_per_owner(self):
        user = self.make_user()
        SavedAddress.objects.create(user=user, is_default=True, **self.FIELDS)
        with self.assertRaises(IntegrityError), transaction.atomic():
            SavedAddress.objects.create(user=user, is_default=True, **self.FIELDS)
        SavedAddress.objects.create(user=user, is_default=False, **self.FIELDS)

    def test_snapshot_is_a_copy(self):
        addr = SavedAddress.objects.create(user=self.make_user(), **self.FIELDS)
        snap = addr.snapshot()
        addr.city = "Mumbai"
        addr.save()
        self.assertEqual(snap["city"], "Pune")


class NotifyAndAuditTests(APIBase):
    def test_notify_each_role(self):
        for who in (self.make_user(), self.make_remaker(), self.make_admin()):
            n = notify(who, "Hello", "Body", module="orders", ref_type="order", ref_id="ORD-1")
            self.assertTrue(n.public_id.startswith("NTF-"))
        self.assertEqual(Notification.objects.count(), 3)

    def test_notify_rejects_other_objects(self):
        with self.assertRaises(ValueError):
            notify(Category(name="x"), "t", "b")

    def test_one_recipient_only(self):
        user, remaker = self.make_user(), self.make_remaker()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Notification.objects.create(user=user, remaker=remaker, title="t", body="b")
        with self.assertRaises(IntegrityError), transaction.atomic():
            Notification.objects.create(title="t", body="b")

    def test_mark_read(self):
        n = notify(self.make_user(), "t", "b")
        mark_read(n)
        n.refresh_from_db()
        self.assertTrue(n.is_read)
        self.assertTrue(n.read_at)

    def test_audit(self):
        admin = self.make_admin()
        row = audit(admin, "listing.disable", "listing", "LST-1001", before={"s": "Live"}, after={"s": "Off"}, reason="spam")
        self.assertEqual(row.actor_type, "admin")
        self.assertEqual(row.actor_public_id, admin.public_id)
        self.assertEqual(audit(None, "job.run", "job", "1").actor_type, "system")
        self.assertEqual(AuditLog.objects.count(), 2)


class EventTests(APIBase):
    def test_listener_receives_payload(self):
        seen = []
        events.listing_published.connect(lambda sender, **kw: seen.append(kw), weak=False, dispatch_uid="t1")
        try:
            events.emit(events.listing_published, "test", listing_public_id="LST-1001", seller_type="user", seller_ref="USR-1001")
        finally:
            events.listing_published.disconnect(dispatch_uid="t1")
        self.assertEqual(seen[0]["listing_public_id"], "LST-1001")

    def test_broken_listener_does_not_break_caller(self):
        def boom(sender, **kw):
            raise RuntimeError("bad listener")

        events.order_placed.connect(boom, weak=False, dispatch_uid="t2")
        try:
            with self.assertLogs("apps.core.events", level="ERROR"):
                events.emit(events.order_placed, "test", order_public_id="ORD-1", buyer_ref="USR-1")
        finally:
            events.order_placed.disconnect(dispatch_uid="t2")

    def test_all_eight_events_exist(self):
        for name in (
            "listing_published", "order_placed", "order_delivered", "review_posted",
            "donation_received", "donation_completed", "ticket_opened", "report_filed",
        ):
            self.assertTrue(hasattr(events, name), name)


class ExceptionHandlerTests(APIBase):
    def test_integrity_error_becomes_409(self):
        r = api_exception_handler(IntegrityError("dup"), {})
        self.assertEqual(r.status_code, 409)
        self.assertFalse(r.data["success"])

    def test_validation_error_has_errors_dict(self):
        user = self.make_user()
        r = self.patch("/api/users/profile/", {"phone": "abc"}, as_=user)
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.data["success"])
        self.assertIn("phone", r.data["errors"])


def _image_file(fmt="PNG", size=(10, 10), name="x"):
    buf = BytesIO()
    Image.new("RGB", size, "red").save(buf, fmt)
    return SimpleUploadedFile(f"{name}.{fmt.lower()}", buf.getvalue())


class ImageValidatorTests(APIBase):
    def test_allowed_formats(self):
        for fmt in ("PNG", "JPEG", "WEBP"):
            validate_image(_image_file(fmt))

    def test_gif_rejected(self):
        with self.assertRaises(ValidationError):
            validate_image(_image_file("GIF"))

    def test_not_an_image_rejected_even_with_image_name(self):
        with self.assertRaises(ValidationError):
            validate_image(SimpleUploadedFile("fake.png", b"this is not an image"))

    def test_too_big_rejected(self):
        f = _image_file()
        f.size = 6 * 1024 * 1024
        with self.assertRaises(ValidationError):
            validate_image(f)
