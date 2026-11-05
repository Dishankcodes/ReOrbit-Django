import io
import os
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image

from apps.core.testing import APIBase
from apps.remakers.models import ReMakers
from apps.users.models import Users

TMP = tempfile.mkdtemp(prefix="reorbit_test_media_")


def image_file(fmt="PNG", size=(40, 30), name="pic.png", content_type="image/png"):
    buf = io.BytesIO()
    Image.new("RGB", size, (200, 120, 40)).save(buf, format=fmt)
    return SimpleUploadedFile(name, buf.getvalue(), content_type=content_type)


@override_settings(MEDIA_ROOT=TMP)
class ProfileTests(APIBase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TMP, ignore_errors=True)

    def upload(self, url, as_, file, field="image"):
        return self.client.post(url, {field: file}, format="multipart", **self._headers(as_))

    def delete_(self, url, as_):
        return self.client.delete(url, **self._headers(as_))

    # ---------------- user ----------------
    def test_user_get_profile(self):
        user = self.make_user()
        r = self.get("/api/users/profile/", as_=user)
        self.assertEqual(r.status_code, 200)
        self.assertEnvelope(r)
        self.assertEqual(r.data["data"]["account"]["email"], "user@example.com")
        self.assertIn("bio", r.data["data"]["profile"])

    def test_user_requires_login_and_role(self):
        self.assertEqual(self.get("/api/users/profile/").status_code, 401)
        self.assertEqual(self.get("/api/users/profile/", as_=self.make_remaker()).status_code, 403)

    def test_user_update_name_and_fields(self):
        user = self.make_user()
        r = self.patch(
            "/api/users/profile/",
            {"full_name": "  Asha   Rao ", "bio": "Upcycler", "city": "Pune", "pincode": "380015",
             "phone": "+91 98765 43210"},
            as_=user,
        )
        self.assertEqual(r.status_code, 200, r.data)
        user.refresh_from_db()
        self.assertEqual(user.full_name, "Asha Rao")
        self.assertEqual(user.profile.city, "Pune")
        self.assertEqual(r.data["data"]["account"]["full_name"], "Asha Rao")

    def test_user_validation(self):
        user = self.make_user()
        for payload in (
            {"full_name": "  "},
            {"pincode": "12"},
            {"phone": "abc"},
            {"bio": "x" * 251},
            {"notification_preferences": {"email": "yes"}},
            {"privacy_preferences": ["a"]},
        ):
            r = self.patch("/api/users/profile/", payload, as_=user)
            self.assertEqual(r.status_code, 400, payload)
            self.assertIn("errors", r.data)

    def test_gujarat_only(self):
        user = self.make_user()
        for pin in ("411001", "110001", "560001", "359999", "396590", "396215", "396230"):
            r = self.patch("/api/users/profile/", {"pincode": pin}, as_=user)
            if pin == "396590":
                self.assertEqual(r.status_code, 200, pin)  # last Gujarat pincode
            else:
                self.assertEqual(r.status_code, 400, pin)
                self.assertIn("Gujarat", r.data["errors"]["pincode"][0])
        for pin in ("360001", "380015", "395007", "390001", "361001"):
            self.assertEqual(self.patch("/api/users/profile/", {"pincode": pin}, as_=user).status_code, 200, pin)
        r = self.patch("/api/users/profile/", {"state": "Maharashtra"}, as_=user)
        self.assertEqual(r.status_code, 400)
        r = self.patch("/api/users/profile/", {"state": "gujarat"}, as_=user)
        self.assertEqual(r.data["data"]["profile"]["state"], "Gujarat")

    def test_state_is_set_to_gujarat_with_city(self):
        user = self.make_user()
        r = self.patch("/api/users/profile/", {"city": "Surat", "pincode": "395007"}, as_=user)
        self.assertEqual(r.data["data"]["profile"]["state"], "Gujarat")

    def test_remaker_gujarat_only(self):
        rm = self.make_remaker()
        self.assertEqual(self.patch("/api/remakers/profile/", {"pincode": "411001"}, as_=rm).status_code, 400)
        self.assertEqual(self.patch("/api/remakers/profile/", {"state": "Goa"}, as_=rm).status_code, 400)
        r = self.patch("/api/remakers/profile/", {"pincode": "380015", "city": "Ahmedabad"}, as_=rm)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["data"]["profile"]["state"], "Gujarat")

    def test_saved_address_gujarat_only(self):
        from apps.core.serializers import SavedAddressSerializer
        base = dict(recipient_name="A", phone="9876543210", address_line1="1 Road", city="Surat", state="Gujarat")
        self.assertFalse(SavedAddressSerializer(data=dict(base, pincode="411001")).is_valid())
        self.assertFalse(SavedAddressSerializer(data=dict(base, pincode="395007", state="Goa")).is_valid())
        self.assertTrue(SavedAddressSerializer(data=dict(base, pincode="395007")).is_valid())

    def test_email_cannot_be_changed(self):
        user = self.make_user()
        r = self.patch("/api/users/profile/", {"email": "other@example.com", "bio": "x"}, as_=user)
        self.assertEqual(r.status_code, 400)
        self.assertIn("email", r.data["errors"])
        user.refresh_from_db()
        self.assertEqual(user.email, "user@example.com")
        user.profile.refresh_from_db()
        self.assertEqual(user.profile.bio, "")  # nothing was saved
        # sending the same email back is fine
        r = self.patch("/api/users/profile/", {"email": "USER@example.com", "bio": "x"}, as_=user)
        self.assertEqual(r.status_code, 200)

    def test_remaker_email_cannot_be_changed(self):
        rm = self.make_remaker()
        r = self.patch("/api/remakers/profile/", {"email": "new@example.com"}, as_=rm)
        self.assertEqual(r.status_code, 400)
        self.assertIn("email", r.data["errors"])

    def test_user_cannot_set_counters_or_email(self):
        user = self.make_user()
        r = self.patch(
            "/api/users/profile/",
            {"orbit_points": 9999, "total_sales": 50, "status": "blocked"},
            as_=user,
        )
        self.assertEqual(r.status_code, 200)
        user.refresh_from_db()
        self.assertEqual(user.profile.orbit_points, 0)
        self.assertEqual(user.profile.total_sales, 0)
        self.assertEqual(user.status, Users.Status.ACTIVE)

    def test_user_preferences_saved(self):
        user = self.make_user()
        r = self.patch(
            "/api/users/profile/",
            {"notification_preferences": {"order_updates": True, "offers": False}},
            as_=user,
        )
        self.assertEqual(r.status_code, 200)
        user.profile.refresh_from_db()
        self.assertEqual(user.profile.notification_preferences["offers"], False)

    def test_user_photo_upload_replace_remove(self):
        user = self.make_user()
        r = self.upload("/api/users/profile/photo/", user, image_file())
        self.assertEqual(r.status_code, 200, r.data)
        url = r.data["data"]["profile"]["profile_image"]
        self.assertTrue(url.startswith("http"), url)
        self.assertIn("/uploads/users/profile/", url)
        user.profile.refresh_from_db()
        first = user.profile.profile_image.path
        self.assertTrue(os.path.exists(first))
        self.assertNotIn("pic", os.path.basename(first))  # original name is not kept
        # replace: the old file is deleted
        r = self.upload("/api/users/profile/photo/", user, image_file("JPEG", name="b.jpg", content_type="image/jpeg"))
        self.assertEqual(r.status_code, 200)
        user.profile.refresh_from_db()
        self.assertFalse(os.path.exists(first))
        second = user.profile.profile_image.path
        self.assertTrue(os.path.exists(second))
        # remove
        r = self.delete_("/api/users/profile/photo/", user)
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.data["data"]["profile"]["profile_image"])
        self.assertFalse(os.path.exists(second))

    def test_photo_rejects_bad_files(self):
        user = self.make_user()
        gif = io.BytesIO()
        Image.new("RGB", (10, 10)).save(gif, format="GIF")
        bad = [
            SimpleUploadedFile("x.gif", gif.getvalue(), content_type="image/gif"),
            SimpleUploadedFile("x.png", b"not an image", content_type="image/png"),
            SimpleUploadedFile("x.txt", b"hello", content_type="text/plain"),
        ]
        for f in bad:
            r = self.upload("/api/users/profile/photo/", user, f)
            self.assertEqual(r.status_code, 400)
        self.assertEqual(self.post("/api/users/profile/photo/", {}, as_=user).status_code, 415)
        r = self.client.post("/api/users/profile/photo/", {}, format="multipart", **self._headers(user))
        self.assertEqual(r.status_code, 400)

    def test_photo_too_large(self):
        user = self.make_user()
        # random noise does not compress, so this PNG is really bigger than 5 MB
        big = Image.frombytes("RGB", (1500, 1500), os.urandom(1500 * 1500 * 3))
        buf = io.BytesIO()
        big.save(buf, format="PNG")
        self.assertGreater(len(buf.getvalue()), 5 * 1024 * 1024)
        f = SimpleUploadedFile("big.png", buf.getvalue(), content_type="image/png")
        r = self.upload("/api/users/profile/photo/", user, f)
        self.assertEqual(r.status_code, 400)

    def test_large_photo_is_shrunk(self):
        user = self.make_user()
        r = self.upload("/api/users/profile/photo/", user, image_file(size=(3000, 2000)))
        self.assertEqual(r.status_code, 200)
        user.profile.refresh_from_db()
        with Image.open(user.profile.profile_image.path) as img:
            self.assertLessEqual(max(img.size), 1024)

    def test_suspended_user_is_read_only(self):
        user = self.make_user(status=Users.Status.SUSPENDED)
        self.assertEqual(self.get("/api/users/profile/", as_=user).status_code, 200)
        self.assertEqual(self.patch("/api/users/profile/", {"bio": "x"}, as_=user).status_code, 403)
        self.assertEqual(self.upload("/api/users/profile/photo/", user, image_file()).status_code, 403)

    def test_blocked_user_cannot_use_profile(self):
        user = self.make_user(status=Users.Status.BLOCKED)
        self.assertEqual(self.get("/api/users/profile/", as_=user).status_code, 403)

    def test_one_user_cannot_touch_another(self):
        a = self.make_user("a@example.com")
        b = self.make_user("b@example.com")
        self.patch("/api/users/profile/", {"bio": "mine"}, as_=a)
        b.profile.refresh_from_db()
        self.assertEqual(b.profile.bio, "")

    # ---------------- remaker ----------------
    def test_remaker_update_username_and_studio(self):
        rm = self.make_remaker()
        other = self.make_remaker("o@example.com", "Taken Name")
        r = self.patch("/api/remakers/profile/", {"username": "taken name"}, as_=rm)
        self.assertEqual(r.status_code, 400)
        self.assertIn("username", r.data["errors"])
        r = self.patch("/api/remakers/profile/", {"username": "!!"}, as_=rm)
        self.assertEqual(r.status_code, 400)
        r = self.patch(
            "/api/remakers/profile/",
            {"username": "Maker One", "full_name": "Rhea Shah", "studio_name": "Rhea Studio",
             "skills": "Sewing, Patchwork", "social_links": {"instagram": "https://instagram.com/rhea", "website": ""}},
            as_=rm,
        )
        self.assertEqual(r.status_code, 200, r.data)
        rm.refresh_from_db()
        self.assertEqual(rm.full_name, "Rhea Shah")
        self.assertEqual(rm.profile.social_links, {"instagram": "https://instagram.com/rhea"})
        self.assertEqual(r.data["data"]["account"]["username"], "Maker One")
        del other

    def test_remaker_social_links_validation(self):
        rm = self.make_remaker()
        for links in ({"instagram": "javascript:alert(1)"}, {"myspace": "https://x.com"}, ["a"]):
            r = self.patch("/api/remakers/profile/", {"social_links": links}, as_=rm)
            self.assertEqual(r.status_code, 400, links)

    def test_remaker_cannot_set_ratings(self):
        rm = self.make_remaker()
        self.patch("/api/remakers/profile/", {"rating_average": "5.00", "rating_count": 99}, as_=rm)
        rm.profile.refresh_from_db()
        self.assertEqual(rm.profile.rating_count, 0)

    def test_remaker_photo_and_cover(self):
        rm = self.make_remaker()
        r = self.upload("/api/remakers/profile/photo/", rm, image_file())
        self.assertEqual(r.status_code, 200, r.data)
        self.assertIn("/uploads/remakers/profile/", r.data["data"]["profile"]["profile_image"])
        r = self.upload("/api/remakers/profile/cover/", rm, image_file("WEBP", size=(2400, 800), name="c.webp", content_type="image/webp"))
        self.assertEqual(r.status_code, 200, r.data)
        self.assertIn("/uploads/remakers/cover/", r.data["data"]["profile"]["cover_image"])
        rm.profile.refresh_from_db()
        with Image.open(rm.profile.cover_image.path) as img:
            self.assertLessEqual(max(img.size), 1920)
        r = self.delete_("/api/remakers/profile/cover/", rm)
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.data["data"]["profile"]["cover_image"])
        self.assertTrue(rm.profile.__class__.objects.get(pk=rm.profile.pk).profile_image)  # photo untouched

    def test_roles_are_separate(self):
        user, rm = self.make_user(), self.make_remaker()
        self.assertEqual(self.upload("/api/remakers/profile/photo/", user, image_file()).status_code, 403)
        self.assertEqual(self.upload("/api/users/profile/photo/", rm, image_file()).status_code, 403)

    def test_me_returns_absolute_image_url(self):
        user = self.make_user()
        self.upload("/api/users/profile/photo/", user, image_file())
        r = self.get("/api/users/me/", as_=user)
        self.assertTrue(r.data["data"]["user"]["profile"]["profile_image"].startswith("http"))


class ChangePasswordTests(APIBase):
    def test_change_password(self):
        user = self.make_user()
        url = "/api/users/password/change/"
        self.assertEqual(self.post(url, {"current_password": "wrong", "new_password": "abc"}, as_=user).status_code, 400)
        self.assertEqual(self.post(url, {"current_password": "", "new_password": ""}, as_=user).status_code, 400)
        from apps.core.testing import STRONG_PASSWORD
        r = self.post(url, {"current_password": STRONG_PASSWORD, "new_password": "NewPass1"}, as_=user)
        self.assertEqual(r.status_code, 200, r.data)
        r = self.post("/api/users/auth/login/", {"email": "user@example.com", "password": "NewPass1"})
        self.assertEqual(r.status_code, 200)

    def test_same_password_rejected(self):
        from apps.core.testing import STRONG_PASSWORD
        user = self.make_user()
        r = self.post("/api/users/password/change/", {"current_password": STRONG_PASSWORD, "new_password": STRONG_PASSWORD}, as_=user)
        self.assertEqual(r.status_code, 400)

    def test_google_account_can_set_password(self):
        user = self.make_user("g@example.com")
        user.password = None
        user.save(update_fields=["password"])
        r = self.post("/api/users/password/change/", {"new_password": "Abc12345"}, as_=user)
        self.assertEqual(r.status_code, 200, r.data)

    def test_remaker_cannot_use(self):
        self.assertEqual(self.post("/api/users/password/change/", {"new_password": "x"}, as_=self.make_remaker()).status_code, 403)
