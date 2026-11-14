"""Donations from submit to certificate: the pickup-partner handoff, failed-pickup rescheduling,
partial acceptance, warehouse verification, the reward it earns, and spending it at checkout."""

import shutil
import tempfile
from datetime import timedelta

from django.test import override_settings
from django.utils import timezone

from apps.core.tests.test_profile import image_file
from apps.orders import services as order_services
from apps.orders.models import Order
from apps.orders.tests import GOOD_ADDR, OrderBase
from apps.rewards import services as rewards
from apps.rewards.models import Voucher
from apps.users.models import User_Profile

from .models import Donation, PickupPartner

TMP = tempfile.mkdtemp(prefix="reorbit_test_donations_")
SLOT = "9:00 AM \u2013 12:00 PM"
SLOT2 = "3:00 PM \u2013 6:00 PM"


def pickup_day(offset=1):
    """A day donors may pick: tomorrow or later, never a Sunday."""
    d = timezone.localdate() + timedelta(days=offset)
    while d.weekday() == 6:
        d += timedelta(days=1)
    return d.isoformat()


@override_settings(MEDIA_ROOT=TMP)
class DonationTests(OrderBase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TMP, ignore_errors=True)

    def setUp(self):
        super().setUp()
        self.ops = self.make_admin("ops@example.com", modules={"donations": "edit"})
        r = self.post("/api/orders/addresses/", {**GOOD_ADDR, "label": "Work", "city": "Ahmedabad", "pincode": "380015"},
                      as_=self.buyer)
        self.assertEqual(r.status_code, 201, r.data)
        self.pickup_addr = r.data["data"]["address"]["id"]
        self.partner = PickupPartner.objects.get(name="Pickup team A")  # seeded by migration 0003

    # ---- helpers ------------------------------------------------------- #
    def donate(self, who=None, photos=1, **over):
        body = {"title": "Oak bookshelf", "category": "Furniture", "description": "Solid oak, three shelves, a little worn.",
                "condition": "Good", "quantity": "1", "address_id": self.pickup_addr, "contact_name": "Asha Shah",
                "phone": "9876543210", "date": pickup_day(), "slot": SLOT, "note": ""}
        body.update(over)
        if photos:
            body["images"] = [image_file(name=f"p{i}.png") for i in range(photos)]
        return self.client.post("/api/donations/me/", body, format="multipart", **self._headers(who or self.buyer))

    def act(self, donation_id, key, who=None, **payload):
        return self.post(f"/api/donations/admin/{donation_id}/{key}/", payload, as_=who or self.ops)

    def accept(self, donation_id, **over):
        body = {"date": pickup_day(2), "slot": SLOT, "partner": "Pickup team A"}
        body.update(over)
        return self.act(donation_id, "accept", **body)

    def handover_code(self, donation_id):
        return self.get(f"/api/donations/me/{donation_id}/", as_=self.buyer).data["data"]["pickup"]["handover_code"]

    def partner_get(self, path, token=None):
        return self.client.get(path, HTTP_X_PARTNER_TOKEN=token or self.partner.token)

    def partner_post(self, path, body=None, token=None):
        return self.client.post(path, body or {}, format="json", HTTP_X_PARTNER_TOKEN=token or self.partner.token)

    def received_donation(self, quantity=1, **over):
        """A donation taken all the way to Received via the real partner handoff. Returns its public id."""
        did = self.donate(quantity=str(quantity), **over).data["data"]["id"]
        self.accept(did)
        code = self.handover_code(did)
        r = self.partner_post(f"/api/donations/partner/pickups/{did}/collect/", {"code": code})
        self.assertEqual(r.status_code, 200, r.data)
        r = self.act(did, "received")
        self.assertEqual(r.status_code, 200, r.data)
        return did

    # ---- 1. pickup handover verification -------------------------------- #
    def test_collection_needs_the_donors_code(self):
        did = self.donate().data["data"]["id"]
        self.accept(did)
        r = self.partner_post(f"/api/donations/partner/pickups/{did}/collect/", {"code": "0000"})
        self.assertEqual((r.status_code, r.data["code"]), (400, "CODE_MISMATCH"))
        self.assertEqual(Donation.objects.get(public_id=did).status, "Scheduled")
        r = self.act(did, "pickedUp", code="0000")  # the admin fallback path checks it too
        self.assertEqual((r.status_code, r.data["code"]), (400, "CODE_MISMATCH"))
        good = self.handover_code(did)
        r = self.partner_post(f"/api/donations/partner/pickups/{did}/collect/", {"code": good})
        self.assertEqual((r.status_code, r.data["data"]["status"]), (200, "Picked_Up"))
        mine = self.get(f"/api/donations/me/{did}/", as_=self.buyer).data["data"]
        self.assertIn("Code verified", mine["events"][-1]["detail"])

    # ---- 2. pickup partner workflow -------------------------------------- #
    def test_partner_sees_only_their_own_assigned_pickups(self):
        other = PickupPartner.objects.get(name="Pickup team B")
        mine = self.donate().data["data"]["id"]
        self.accept(mine, partner="Pickup team A")
        theirs = self.donate().data["data"]["id"]
        self.accept(theirs, partner="Pickup team B")

        r = self.partner_get("/api/donations/partner/pickups/")
        self.assertEqual([p["id"] for p in r.data["data"]], [mine])
        r = self.partner_get("/api/donations/partner/pickups/", token=other.token)
        self.assertEqual([p["id"] for p in r.data["data"]], [theirs])

        # team A cannot touch team B's pickup
        code = self.handover_code(theirs)
        r = self.partner_post(f"/api/donations/partner/pickups/{theirs}/collect/", {"code": code})
        self.assertEqual((r.status_code, r.data["code"]), (403, "NOT_YOURS"))

        self.assertEqual(self.partner_get("/api/donations/partner/pickups/", token="bogus").status_code, 401)

    def test_admin_can_see_and_issue_partner_tokens(self):
        self.assertEqual(self.get("/api/donations/admin/partners/", as_=self.boss).status_code, 403)
        r = self.get("/api/donations/admin/partners/", as_=self.ops)
        self.assertEqual({p["name"] for p in r.data["data"]}, {"Pickup team A", "Pickup team B", "Pickup team C"})
        self.assertTrue(all(p["token"] for p in r.data["data"]))
        r = self.post("/api/donations/admin/partners/", {"name": "Pickup team D", "phone": "9000000000"}, as_=self.ops)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(r.data["data"]["token"])

    # ---- 3. failed pickup handling ---------------------------------------- #
    def test_failed_pickup_is_rescheduled_not_rejected(self):
        did = self.donate().data["data"]["id"]
        self.accept(did)
        r = self.partner_post(f"/api/donations/partner/pickups/{did}/failed/", {"reason": "Donor was not home"})
        self.assertEqual((r.status_code, r.data["data"]["status"]), (200, "Failed_Pickup"))
        self.assertEqual(Donation.objects.get(public_id=did).failed_pickup_count, 1)
        # the donor can still see their code and reschedule themselves
        self.assertTrue(self.handover_code(did))
        r = self.post(f"/api/donations/me/{did}/reschedule/", {"date": pickup_day(4), "slot": SLOT2}, as_=self.buyer)
        self.assertEqual((r.status_code, r.data["data"]["status"]), (200, "Scheduled"))
        # or admin can reschedule it directly
        r = self.act(did, "failed", reason="Gate was locked")
        self.assertEqual(r.data["data"]["status"], "Failed_Pickup")
        r = self.act(did, "reschedule", date=pickup_day(6), slot=SLOT, partner="Pickup team B")
        self.assertEqual((r.status_code, r.data["data"]["status"], r.data["data"]["partner"]),
                         (200, "Scheduled", "Pickup team B"))
        code = self.handover_code(did)
        r = self.partner_post(f"/api/donations/partner/pickups/{did}/collect/", {"code": code},
                              token=PickupPartner.objects.get(name="Pickup team B").token)
        self.assertEqual(r.status_code, 200, r.data)

    def test_cancel_still_possible_after_a_failed_pickup(self):
        did = self.donate().data["data"]["id"]
        self.accept(did)
        self.partner_post(f"/api/donations/partner/pickups/{did}/failed/", {"reason": "No answer at the door"})
        r = self.post(f"/api/donations/me/{did}/cancel/", {"reason": "I'll drop it off myself instead"}, as_=self.buyer)
        self.assertEqual((r.status_code, r.data["data"]["status"]), (200, "Cancelled"))

    # ---- 4 & 5. quantity and condition verification at the warehouse ------ #
    def test_warehouse_records_and_flags_mismatches(self):
        did = self.received_donation(quantity=3)  # uses received action with defaults
        row = Donation.objects.get(public_id=did)
        self.assertEqual((row.received_quantity, row.received_condition, row.quantity_mismatch), (3, "Good", False))

        did2 = self.donate(quantity="4").data["data"]["id"]
        self.accept(did2)
        code = self.handover_code(did2)
        self.partner_post(f"/api/donations/partner/pickups/{did2}/collect/", {"code": code})
        r = self.act(did2, "received", received_quantity="3", received_condition="Medium", note="One item was broken")
        self.assertEqual(r.status_code, 200, r.data)
        row2 = Donation.objects.get(public_id=did2)
        self.assertEqual((row2.quantity_mismatch, row2.condition_mismatch, row2.received_note),
                         (True, True, "One item was broken"))
        admin_view = self.get(f"/api/donations/admin/{did2}/", as_=self.ops).data["data"]
        self.assertEqual((admin_view["quantity_mismatch"], admin_view["condition_mismatch"]), (True, True))
        # the reward is based on what actually arrived, not what was declared
        self.assertEqual((row2.reward_points, row2.weight_kg), (rewards.reward_points(3), rewards.weight_kg("Furniture", 3)))

    # ---- 6. partial acceptance --------------------------------------------- #
    def test_admin_can_partially_accept_a_multi_item_donation(self):
        did = self.donate(quantity="5").data["data"]["id"]
        r = self.accept(did, accepted_quantity="2")  # no reason given
        self.assertIn("partial_reason", r.data["errors"])
        r = self.accept(did, accepted_quantity="2", partial_reason="3 chairs are broken beyond use")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual((r.data["data"]["accepted_quantity"], r.data["data"]["quantity"]), (2, 5))
        mine = self.get(f"/api/donations/me/{did}/", as_=self.buyer).data["data"]
        self.assertEqual(mine["partial_reject_reason"], "3 chairs are broken beyond use")
        self.assertIn("Partially accepted (2 of 5)", [e["label"] for e in mine["events"]])
        # too many, or too few, accepted
        did2 = self.donate(quantity="5").data["data"]["id"]
        self.assertIn("accepted_quantity", self.accept(did2, accepted_quantity="6").data["errors"])
        self.assertIn("accepted_quantity", self.accept(did2, accepted_quantity="0").data["errors"])

    # ---- the reward, the voucher, and spending it at checkout -------------- #
    def test_full_journey_earns_points_and_one_voucher(self):
        did = self.donate().data["data"]["id"]
        r = self.accept(did)
        self.assertEqual(r.status_code, 200, r.data)
        mine = self.get("/api/donations/me/", as_=self.buyer).data["data"][0]
        self.assertEqual(mine["status"], "Scheduled")
        self.assertEqual(len(mine["pickup"]["handover_code"]), 4)
        self.assertEqual((mine["pickup"]["partner"]["team"], mine["pickup"]["partner"]["name"]),
                         ("Pickup team A", "Ravi Kumar"))

        self.assertEqual(self.act(did, "received").status_code, 409)  # not picked up yet: no reward
        self.assertFalse(Voucher.objects.exists())

        code = self.handover_code(did)
        self.partner_post(f"/api/donations/partner/pickups/{did}/collect/", {"code": code})
        r = self.act(did, "received")
        self.assertEqual(r.status_code, 200, r.data)
        reward = r.data["data"]["reward"]
        self.assertEqual((reward["points"], reward["voucher_amount"]), (60, 140))  # 1 Furniture item in good condition
        self.assertEqual(User_Profile.objects.get(user=self.buyer).orbit_points, 60)

        again = self.act(did, "received")  # a double click must not pay twice
        self.assertEqual((again.status_code, again.data["code"]), (409, "BAD_STATE"))
        self.assertEqual(Voucher.objects.count(), 1)
        self.assertEqual(User_Profile.objects.get(user=self.buyer).orbit_points, 60)

        # ---- 9. certificate download -------------------------------------- #
        r = self.act(did, "complete", ngo="Helping Hands")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertTrue(r.data["data"]["certificate"])
        self.assertEqual((r.data["data"]["distributed_quantity"], r.data["data"]["ngo"]), (1, "Helping Hands"))
        pdf = self.get(f"/api/donations/me/{did}/certificate/", as_=self.buyer)
        self.assertEqual((pdf.status_code, bytes(pdf.content[:4])), (200, b"%PDF"))
        self.assertEqual(self.get(f"/api/donations/me/{did}/certificate/", as_=self.seller).status_code, 404)

    def test_my_vouchers_are_private_to_members(self):
        self.received_donation()
        mine = self.get("/api/rewards/me/vouchers/", as_=self.buyer).data["data"]
        self.assertEqual((len(mine["vouchers"]), mine["ready"]), (1, 1))
        v = mine["vouchers"][0]
        self.assertEqual((v["status"], v["amount"], v["min_order"], v["source"]["type"]), ("Active", 140, 280, "donation"))
        self.assertEqual(self.get("/api/rewards/me/vouchers/", as_=self.seller).data["data"]["vouchers"], [])
        self.assertEqual(self.get("/api/rewards/me/vouchers/", as_=self.maker).status_code, 403)

    def test_donated_voucher_pays_at_checkout_end_to_end(self):
        self.received_donation()
        code = self.get("/api/rewards/me/vouchers/", as_=self.buyer).data["data"]["vouchers"][0]["code"]
        r = self.checkout([{"id": self.table.public_id, "qty": 1}], voucher_code=code)
        self.assertEqual(r.status_code, 201, r.data)
        order = Order.objects.get()
        self.assertEqual((order.discount, order.subtotal), (140, 2400))
        v = Voucher.objects.get()
        self.assertEqual(v.status, "Used")
        listed = self.get("/api/rewards/me/vouchers/", as_=self.buyer).data["data"]
        self.assertEqual((listed["vouchers"][0]["status"], listed["ready"]), ("Used", 0))
        again = self.checkout([{"id": self.tote.public_id, "qty": 1}], voucher_code=code)
        self.assertEqual((again.status_code, again.data["code"]), (400, "VOUCHER_USED"))

    def test_cancelling_the_only_order_gives_the_voucher_back(self):
        self.received_donation()
        code = Voucher.objects.get().code
        self.assertEqual(self.checkout([{"id": self.table.public_id, "qty": 1}], voucher_code=code).status_code, 201)
        order = Order.objects.get()
        order_services.cancel_order(order.pk, by="buyer", actor=self.buyer, reason="changed my mind")
        v = Voucher.objects.get()
        self.assertEqual((v.status, v.used_checkout, v.used_at), ("Active", "", None))
        self.assertEqual(self.checkout([{"id": self.table.public_id, "qty": 1}], voucher_code=code).status_code, 201)

    def test_reward_rules_match_the_app(self):
        self.assertEqual(rewards.reward_points(1), 60)
        self.assertEqual(rewards.reward_points(3), 80)
        self.assertEqual(rewards.voucher_amount("Furniture", 1, "Good"), 140)
        self.assertEqual(rewards.voucher_amount("Books", 1, "Worst"), 50)  # never below the minimum
        self.assertEqual(rewards.voucher_amount("Furniture", 9, "Good"), 500)  # never above the maximum

    # ---- 10. donor tracking: a meaningful event at every stage -------------- #
    def test_donor_sees_an_event_for_every_stage(self):
        did = self.received_donation()
        self.act(did, "complete", ngo="Helping Hands")
        labels = [e["label"] for e in self.get(f"/api/donations/me/{did}/", as_=self.buyer).data["data"]["events"]]
        self.assertEqual(labels, ["Donation submitted", "Accepted, pickup scheduled", "Picked up",
                                  "Received at the warehouse", "Completed, certificate issued"])

    # ---- the donor changes their mind ----------------------------------- #
    def test_donor_can_reschedule_twice_then_cancel(self):
        did = self.donate().data["data"]["id"]
        url = f"/api/donations/me/{did}/reschedule/"
        for i in (2, 3):
            r = self.post(url, {"date": pickup_day(i), "slot": SLOT, "reason": "away"}, as_=self.buyer)
            self.assertEqual(r.status_code, 200, r.data)
        r = self.post(url, {"date": pickup_day(4), "slot": SLOT}, as_=self.buyer)
        self.assertEqual((r.status_code, r.data["code"]), (409, "RESCHEDULE_LIMIT"))
        self.assertEqual(Donation.objects.get().reschedule_count, 2)

        r = self.post(f"/api/donations/me/{did}/note/", {"note": "Ring the bell twice"}, as_=self.buyer)
        self.assertEqual(r.data["data"]["pickup"]["note"], "Ring the bell twice")

        r = self.post(f"/api/donations/me/{did}/cancel/", {"reason": "Found a new home for it"}, as_=self.buyer)
        self.assertEqual((r.status_code, r.data["data"]["status"]), (200, "Cancelled"))
        self.assertEqual(self.accept(did).status_code, 409)  # too late for the team
        self.assertEqual(self.post(f"/api/donations/me/{did}/cancel/", {"reason": "again"}, as_=self.buyer).status_code, 409)

    def test_nobody_can_touch_someone_elses_donation(self):
        did = self.donate().data["data"]["id"]
        for action, body in (("cancel", {"reason": "mine now"}), ("note", {"note": "x"}),
                             ("reschedule", {"date": pickup_day(2), "slot": SLOT})):
            r = self.post(f"/api/donations/me/{did}/{action}/", body, as_=self.seller)
            self.assertEqual(r.status_code, 404, (action, r.data))
        self.assertEqual(self.get(f"/api/donations/me/{did}/", as_=self.seller).status_code, 404)

    # ---- validation and permissions ------------------------------------- #
    def test_a_donation_needs_a_photo_and_valid_fields(self):
        r = self.donate(photos=0, title="", description="short", condition="Broken", quantity="0")
        self.assertEqual(r.status_code, 400, r.data)
        for field in ("title", "description", "condition", "quantity", "images"):
            self.assertIn(field, r.data["errors"])
        self.assertFalse(Donation.objects.exists())

    def test_only_serviceable_own_addresses(self):
        r = self.donate(address_id=self.addr)  # Surat, outside the pickup area
        self.assertEqual(r.status_code, 400, r.data)
        self.assertIn("address_id", r.data["errors"])
        other = self.make_user("other@example.com")
        self.assertIn("address_id", self.donate(who=other).data["errors"])

    def test_admin_screens_need_the_donations_module(self):
        self.assertEqual(self.get("/api/donations/admin/", as_=self.boss).status_code, 403)  # no donations module
        self.assertEqual(self.get("/api/donations/admin/", as_=self.buyer).status_code, 403)  # a member
        self.assertEqual(self.get("/api/donations/me/", as_=self.ops).status_code, 403)  # an admin

    def test_admin_reject_needs_a_reason_and_can_be_reopened(self):
        did = self.donate().data["data"]["id"]
        self.assertEqual(self.act(did, "reject", reason="no").status_code, 400)
        r = self.act(did, "reject", reason="We cannot take large furniture")
        self.assertEqual((r.status_code, r.data["data"]["status"]), (200, "Rejected"))
        r = self.act(did, "reopen")
        self.assertEqual((r.status_code, r.data["data"]["status"]), (200, "Pending"))
        self.assertEqual(self.accept(did).status_code, 200)
