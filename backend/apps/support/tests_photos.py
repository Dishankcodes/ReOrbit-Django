"""Photos sent with a ticket: stored, shown to the sender and to the team, checked for type and count."""

import io
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image

from apps.core.testing import APIBase

from .models import TicketAttachment

TMP = tempfile.mkdtemp()


def png(name="damage.png", color="red"):
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), color).save(buf, "PNG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/png")


@override_settings(MEDIA_ROOT=TMP)
class TicketPhotoTests(APIBase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TMP, ignore_errors=True)

    def setUp(self):
        super().setUp()
        self.maker = self.make_remaker()
        self.agent = self.make_admin("agent@example.com", modules={"support": "edit"})

    def send(self, who, photos, subject="Parcel arrived broken", url="/api/support/me/", **extra):
        body = {"subject": subject, "message": "The table leg was cracked when it arrived.", "photos": photos, **extra}
        return self.client.post(url, body, format="multipart", **self._headers(who))

    def test_a_remaker_sends_photos_and_the_team_sees_them(self):
        r = self.send(self.maker, [png(), png("two.png", "blue")])
        self.assertEqual(r.status_code, 201, r.data)
        ticket = r.data["data"]["ticket"]
        photos = ticket["messages"][0]["photos"]
        self.assertEqual(len(photos), 2)
        self.assertEqual(TicketAttachment.objects.count(), 2)
        seen = self.get(f"/api/support/admin/{ticket['id']}/", as_=self.agent).data["data"]["ticket"]
        self.assertEqual(len(seen["messages"][0]["photos"]), 2)

    def test_a_reply_can_carry_photos_too(self):
        tid = self.send(self.maker, []).data["data"]["ticket"]["id"]
        r = self.client.post(f"/api/support/me/{tid}/", {"message": "Here is another angle.", "photos": [png()]},
                             format="multipart", **self._headers(self.maker))
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(len(r.data["data"]["ticket"]["messages"][-1]["photos"]), 1)

    def test_more_than_three_photos_or_a_non_image_is_refused_and_nothing_is_saved(self):
        from apps.support.models import SupportTicket

        r = self.send(self.maker, [png(f"{i}.png") for i in range(4)])
        self.assertEqual(r.status_code, 400)
        self.assertIn("photos", r.data["errors"])
        fake = SimpleUploadedFile("note.png", b"not an image", content_type="image/png")
        r = self.send(self.maker, [fake])
        self.assertEqual(r.status_code, 400)
        self.assertEqual(SupportTicket.objects.count(), 0)
        self.assertEqual(TicketAttachment.objects.count(), 0)

    def test_a_ticket_without_photos_still_works_as_json(self):
        r = self.post("/api/support/me/", {"subject": "Payout question", "message": "When is my payout?"}, as_=self.maker)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["data"]["ticket"]["messages"][0]["photos"], [])
