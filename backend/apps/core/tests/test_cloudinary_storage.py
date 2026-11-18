"""Cloudinary storage, with the Cloudinary SDK mocked (no network in tests)."""

from unittest import mock

from django.core.files.base import ContentFile
from django.test import SimpleTestCase, override_settings

from apps.core import cloudinary_storage as cs
from apps.core.testing import APIBase
from apps.core.tests.test_profile import image_file

KEYS = dict(CLOUDINARY_URL="", CLOUDINARY_CLOUD_NAME="demo", CLOUDINARY_API_KEY="k", CLOUDINARY_API_SECRET="s",
            CLOUDINARY_FOLDER="reorbit")
CLOUD = {"default": {"BACKEND": "apps.core.cloudinary_storage.CloudinaryMediaStorage"},
         "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}}


@override_settings(**KEYS)
class StorageTests(SimpleTestCase):
    def test_names_map_to_public_ids(self):
        self.assertEqual(cs.split("listings/chair_ab12.jpg"), ("reorbit/listings/chair_ab12", "image", "jpg"))
        self.assertEqual(cs.split("users/profile/me.JPEG"), ("reorbit/users/profile/me", "image", "jpg"))
        self.assertEqual(cs.split("certificates/CERT-1.pdf"), ("reorbit/certificates/CERT-1.pdf", "raw", ""))

    def test_url_is_built_without_an_api_call(self):
        s = cs.CloudinaryMediaStorage()
        url = s.url("listings/chair_ab12.jpg")
        self.assertTrue(url.startswith("https://res.cloudinary.com/demo/image/upload/"), url)
        self.assertTrue(url.endswith("/reorbit/listings/chair_ab12.jpg"), url)
        self.assertIn("/raw/upload/", s.url("certificates/CERT-1.pdf"))
        self.assertEqual(s.url("https://x.test/a.jpg"), "https://x.test/a.jpg")

    def test_new_names_get_a_suffix_so_no_lookup_is_needed(self):
        s = cs.CloudinaryMediaStorage()
        a, b = s.get_available_name("listings/chair.jpg"), s.get_available_name("listings/chair.jpg")
        self.assertNotEqual(a, b)
        self.assertRegex(a, r"^listings/chair_[0-9a-f]{8}\.jpg$")

    def test_save_uploads_and_delete_destroys(self):
        s = cs.CloudinaryMediaStorage()
        with mock.patch("cloudinary.uploader.upload") as up, mock.patch("cloudinary.uploader.destroy") as down:
            name = s.save("listings/chair.jpg", ContentFile(b"fake-bytes"))
            kw = up.call_args.kwargs
            self.assertEqual((kw["public_id"], kw["resource_type"]), (f"reorbit/{name[:-4]}", "image"))
            self.assertEqual(up.call_args.args[0].read(), b"fake-bytes")
            s.delete(name)
            self.assertEqual(down.call_args.args[0], f"reorbit/{name[:-4]}")

    def test_open_downloads_the_file(self):
        s = cs.CloudinaryMediaStorage()
        resp = mock.Mock(content=b"%PDF-1.4", headers={"Content-Type": "application/pdf"})
        resp.raise_for_status = lambda: None
        with mock.patch("requests.get", return_value=resp) as get:
            f = s.open("certificates/CERT-1.pdf")
        self.assertEqual(f.read(), b"%PDF-1.4")
        self.assertIn("/raw/upload/", get.call_args.args[0])


@override_settings(STORAGES=CLOUD, **KEYS)
class UploadThroughTheApiTests(APIBase):
    def test_profile_photo_goes_to_cloudinary_and_url_points_there(self):
        u = self.make_user()
        with mock.patch("cloudinary.uploader.upload") as up:
            r = self.client.post("/api/users/profile/photo/", {"image": image_file()}, format="multipart",
                                 **self._headers(u))
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(up.call_count, 1)
        self.assertTrue(up.call_args.kwargs["public_id"].startswith("reorbit/users/profile/"))
        url = r.data["data"]["profile"]["profile_image"]
        self.assertIn("res.cloudinary.com/demo/image/upload/", url)
