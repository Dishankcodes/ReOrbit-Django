import io
from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from PIL import Image

from apps.core.models import Category, SavedAddress
from apps.core.testing import APIBase
from apps.rewards import services as rewards
from apps.rewards.models import Voucher
from apps.warehouse.models import WarehouseItem

from .models import Donation

SLOT = "9:00 AM – 12:00 PM"


def png(color="red"):
    buf = io.BytesIO()
    Image.new("RGB", (40, 40), color).save(buf, "PNG")
    return SimpleUploadedFile("pic.png", buf.getvalue(), content_type="image/png")


@override_settings(MEDIA_ROOT="/tmp/reorbit-test-media")
class DonationBase(APIBase):
    def setUp(self):
        super().setUp()
        Category.objects.create(name="Books", slug="books", applies_to="Both")
        self.donor = self.make_user("donor@example.com")
        self.other = self.make_user("other@example.com")
        self.boss = self.make_admin("boss@example.com", modules={"donations": "edit"})
        self.blind = self.make_admin("blind@example.com", modules={"orders": "edit"})
        self.addr = self.make_address(self.donor, "380015", "Ahmedabad")

    def make_address(self, user, pincode, city):
        return SavedAddress.objects.create(user=user, label="Home", recipient_name="Asha Shah", phone="9876543210",
                                           address_line1="12 Ring Road", city=city, state="Gujarat", pincode=pincode,
                                           is_default=True)

    def day(self, n=2):
        return (timezone.localdate() + timedelta(days=n)).isoformat()

    def body(self, **over):
        b = {"title": "Old books", "category": "Books", "description": "Twenty school books in good shape.",
             "condition": "Good", "quantity": 3, "address_id": self.addr.public_id, "contact_name": "Asha Shah",
             "phone": "9876543210", "date": self.day(), "slot": SLOT, "note": "Gate 2", "images": [png()]}
        b.update(over)
        return b

    def donate(self, who=None, **over):
        return self.client.post("/api/donations/me/", self.body(**over), format="multipart", **self._headers(who or self.donor))

    def make(self, **over):
        r = self.donate(**over)
        self.assertEqual(r.status_code, 201, r.data)
        return r.data["data"]["donation"]["id"]

    def act(self, did, action, who=None, **payload):
        return self.post(f"/api/donations/admin/{did}/action/", {"action": action, **payload}, as_=who or self.boss)

    def accept(self, did):
        r = self.act(did, "accept", date=self.day(3), slot=SLOT, partner="Pickup team A · Ravi Kumar")
        self.assertEqual(r.status_code, 200, r.data)


class DonationFlowTests(DonationBase):
    def test_full_journey_to_voucher(self):
        did = self.make()
        mine = self.get("/api/donations/me/", as_=self.donor).data["data"]["donations"]
        self.assertEqual(mine[0]["status"], "Pending")
        self.assertEqual(len(mine[0]["images"]), 1)
        self.assertEqual(len(mine[0]["pickup"]["handover_code"]), 4)
        self.assertEqual(mine[0]["pickup"]["address"]["city"], "Ahmedabad")
        # admin sees it, with the donor
        row = self.get("/api/donations/admin/", as_=self.boss).data["data"]["results"][0]
        self.assertEqual((row["id"], row["status"], row["donor"]["email"]), (did, "Pending", "donor@example.com"))

        self.accept(did)
        d = self.get(f"/api/donations/me/{did}/", as_=self.donor).data["data"]["donation"]
        self.assertEqual((d["status"], d["pickup"]["slot"], d["pickup"]["partner"]["team"]), ("Scheduled", SLOT, "Pickup team A"))
        self.assertEqual(self.act(did, "pickedUp").status_code, 200)
        self.assertFalse(Voucher.objects.exists())  # no reward before the warehouse has it
        r = self.act(did, "received")
        self.assertEqual(r.status_code, 200, r.data)

        d = self.get(f"/api/donations/me/{did}/", as_=self.donor).data["data"]["donation"]
        self.assertEqual(d["status"], "Received")
        v = Voucher.objects.get()
        self.assertEqual((v.owner_id, v.amount, v.status), (self.donor.pk, 140, "Active"))  # 3 books x 4 kg x ₹12, rounded to ₹10
        self.assertEqual(d["reward"]["voucher"]["code"], v.code)
        self.assertEqual(d["reward"]["points"], rewards.points_for(3))
        item = WarehouseItem.objects.get()
        self.assertEqual((item.donation.public_id, item.status, item.quantity), (did, "In_Stock", 3))
        mine = self.get("/api/rewards/me/vouchers/", as_=self.donor).data["data"]
        self.assertEqual((mine["ready"], mine["vouchers"][0]["code"]), (1, v.code))

        self.assertEqual(self.act(did, "complete", ngo="Asha Kiran Trust").status_code, 200)
        item.refresh_from_db()
        self.assertEqual((item.status, item.given_to), ("Given_Out", "Asha Kiran Trust"))
        self.assertTrue(self.get(f"/api/donations/me/{did}/", as_=self.donor).data["data"]["donation"]["certificate_id"])

    def test_reward_is_paid_once(self):
        did = self.make()
        self.accept(did)
        self.act(did, "pickedUp")
        self.act(did, "received")
        self.assertEqual(self.act(did, "received").status_code, 409)
        d = Donation.objects.get(public_id=did)
        self.assertEqual(rewards.issue_for_donation(d).pk, Voucher.objects.get().pk)
        self.assertEqual(Voucher.objects.count(), 1)

    def test_voucher_value_rules(self):
        self.assertEqual(rewards.voucher_worth(1.2, "Good"), 50)      # floor
        self.assertEqual(rewards.voucher_worth(12, "Good"), 140)
        self.assertEqual(rewards.voucher_worth(12, "Worst"), 60)
        self.assertEqual(rewards.voucher_worth(100, "Good"), 500)     # cap

    def test_states_cannot_be_skipped(self):
        did = self.make()
        for action in ("pickedUp", "received", "complete", "reschedule", "reopen"):
            self.assertEqual(self.act(did, action, date=self.day(), slot=SLOT, partner="Team", ngo="X").status_code, 409, action)
        self.assertEqual(self.act(did, "nonsense").status_code, 400)

    def test_reject_then_reopen(self):
        did = self.make()
        self.assertEqual(self.act(did, "reject", reason="").status_code, 400)
        self.assertEqual(self.act(did, "reject", reason="Poor condition").status_code, 200)
        d = self.get(f"/api/donations/me/{did}/", as_=self.donor).data["data"]["donation"]
        self.assertEqual((d["status"], d["reject_reason"]), ("Rejected", "Poor condition"))
        self.assertEqual(self.act(did, "reopen").status_code, 200)
        self.assertEqual(Donation.objects.get(public_id=did).status, "Pending")

    def test_accept_needs_team_and_slot(self):
        did = self.make()
        self.assertEqual(self.act(did, "accept", date=self.day(), slot=SLOT).status_code, 400)
        self.assertEqual(self.act(did, "accept", date=self.day(), slot="midnight", partner="T").status_code, 400)
        self.assertEqual(self.act(did, "accept", date=self.day(-1), slot=SLOT, partner="T").status_code, 400)

    def test_donor_cancel_and_reschedule(self):
        did = self.make()
        url = f"/api/donations/me/{did}/reschedule/"
        for n in (3, 4):
            self.assertEqual(self.post(url, {"date": self.day(n), "slot": SLOT}, as_=self.donor).status_code, 200)
        self.assertEqual(self.post(url, {"date": self.day(5), "slot": SLOT}, as_=self.donor).status_code, 409)
        self.assertEqual(self.post(f"/api/donations/me/{did}/cancel/", {"reason": "Changed my mind"}, as_=self.donor).status_code, 200)
        self.assertEqual(self.post(f"/api/donations/me/{did}/cancel/", {}, as_=self.donor).status_code, 409)
        self.assertEqual(self.act(did, "accept", date=self.day(), slot=SLOT, partner="T").status_code, 409)

    def test_cannot_cancel_after_pickup(self):
        did = self.make()
        self.accept(did)
        self.act(did, "pickedUp")
        self.assertEqual(self.post(f"/api/donations/me/{did}/cancel/", {"reason": "x"}, as_=self.donor).status_code, 409)


class DonationRulesTests(DonationBase):
    def test_needs_a_photo_and_valid_fields(self):
        r = self.donate(images=[])
        self.assertEqual(r.status_code, 400)
        self.assertIn("images", r.data["errors"])
        r = self.donate(title="x", description="short", condition="Mint", category="Nope", phone="abc")
        self.assertEqual(r.status_code, 400)
        for field in ("title", "description", "condition", "category", "phone"):
            self.assertIn(field, r.data["errors"])
        self.assertEqual(Donation.objects.count(), 0)

    def test_one_photo_is_enough_and_four_is_the_limit(self):
        self.make(images=[png()])
        r = self.donate(images=[png() for _ in range(5)])
        self.assertEqual(r.status_code, 400)

    def test_pickup_area_and_date_window(self):
        far = self.make_address(self.donor, "395009", "Surat")
        self.assertEqual(self.donate(address_id=far.public_id).status_code, 400)
        self.assertEqual(self.donate(date=self.day(-1)).status_code, 400)
        self.assertEqual(self.donate(date=self.day(45)).status_code, 400)
        self.assertEqual(self.donate(slot="whenever").status_code, 400)

    def test_cannot_use_someone_elses_address(self):
        theirs = self.make_address(self.other, "380015", "Ahmedabad")
        self.assertEqual(self.donate(address_id=theirs.public_id).status_code, 400)

    def test_open_donation_cap(self):
        for _ in range(10):
            self.make()
        self.assertEqual(self.donate().status_code, 400)

    def test_privacy_and_permissions(self):
        did = self.make()
        self.assertEqual(self.get(f"/api/donations/me/{did}/", as_=self.other).status_code, 404)
        self.assertEqual(self.post(f"/api/donations/me/{did}/cancel/", {}, as_=self.other).status_code, 404)
        self.assertEqual(self.get("/api/donations/me/", as_=self.other).data["data"]["donations"], [])
        self.assertEqual(self.get("/api/donations/admin/", as_=self.donor).status_code, 403)
        self.assertEqual(self.get("/api/donations/admin/", as_=self.blind).status_code, 403)
        self.assertEqual(self.act(did, "accept", who=self.blind, date=self.day(), slot=SLOT, partner="T").status_code, 403)
        self.assertEqual(self.get("/api/donations/admin/").status_code, 401)
        view_only = self.make_admin("viewer@example.com", modules={"donations": "view"})
        self.assertEqual(self.get("/api/donations/admin/", as_=view_only).status_code, 200)
        self.assertEqual(self.act(did, "reject", who=view_only, reason="no").status_code, 403)

    def test_admins_are_told_and_donor_is_told(self):
        from apps.core.models import Notification

        did = self.make()
        self.assertTrue(Notification.objects.filter(admin=self.boss, ref_id=did).exists())
        self.assertFalse(Notification.objects.filter(admin=self.blind).exists())
        self.accept(did)
        self.assertTrue(Notification.objects.filter(user=self.donor, ref_id=did, title__icontains="accepted").exists())
