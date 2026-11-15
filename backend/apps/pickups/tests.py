"""Pickup teams (crew, pause/resume, delete rules) and pickups of listed items."""

from datetime import timedelta

from django.utils import timezone

from apps.core.models import Category
from apps.core.testing import APIBase
from apps.donations.models import PickupPartner
from apps.listings.models import Item

from .models import PickupRequest, PickupTeamMember

BASE = "/api/pickups/admin/"
SLOT = "9:00 AM – 12:00 PM"


def day(offset=2):
    d = timezone.localdate() + timedelta(days=offset)
    while d.weekday() == 6:
        d += timedelta(days=1)
    return d.isoformat()


class PickupBase(APIBase):
    def setUp(self):
        super().setUp()
        self.ops = self.make_admin("ops@example.com", modules={"pickups": "edit"})
        self.viewer = self.make_admin("view@example.com", modules={"pickups": "view"})
        self.nobody = self.make_admin("none@example.com", modules={"orders": "edit"})

    def new_team(self, name="Pickup team A", lead="Ravi Kumar", phone="+91 98250 41011", **over):
        body = {"name": name, "area": "Ahmedabad West", "vehicle": "Tata Ace mini-truck", "capacity": 5,
                "lead": {"name": lead, "phone": phone}}
        body.update(over)
        return self.post(f"{BASE}teams/", body, as_=self.ops)

    def team(self, **kw):
        r = self.new_team(**kw)
        self.assertEqual(r.status_code, 201, r.data)
        return r.data["data"]


class TeamTests(PickupBase):
    def test_access(self):
        self.assertEqual(self.get(f"{BASE}teams/").status_code, 401)
        self.assertEqual(self.get(f"{BASE}teams/", as_=self.nobody).status_code, 403)
        self.assertEqual(self.get(f"{BASE}teams/", as_=self.viewer).status_code, 200)
        self.assertEqual(self.new_team().status_code, 201)
        self.assertEqual(self.post(f"{BASE}teams/", {}, as_=self.viewer).status_code, 403)

    def test_donations_admins_can_read_the_teams_to_schedule_with(self):
        donations = self.make_admin("don@example.com", modules={"donations": "edit"})
        self.assertEqual(self.get(f"{BASE}teams/", as_=donations).status_code, 200)
        self.assertEqual(self.new_team().status_code, 201)
        self.assertEqual(self.post(f"{BASE}teams/", {}, as_=donations).status_code, 403)

    def test_create_makes_a_team_with_a_lead_the_donor_sees(self):
        t = self.team(crew=[{"name": "Mahesh", "phone": "+91 98250 41012", "role": "Driver"}])
        self.assertEqual([m["role"] for m in t["members"]], ["Lead", "Driver"])
        p = PickupPartner.objects.get(public_id=t["id"])
        self.assertEqual((p.lead_name, p.phone, p.status), ("Ravi Kumar", "+91 98250 41011", "Active"))

    def test_validation_and_duplicates(self):
        self.team()
        r = self.new_team(phone="+91 98250 41099")
        self.assertEqual(r.status_code, 400)
        self.assertIn("name", r.data["errors"])
        r = self.new_team(name="Pickup team B", phone="+91 98250 41011")
        self.assertEqual(r.status_code, 400)  # the number already belongs to someone
        self.assertEqual(self.new_team(name="Pickup team B", capacity=0, phone="+91 90000 00001").status_code, 400)
        self.assertEqual(self.new_team(name="Pickup team B", phone="abc").status_code, 400)

    def test_second_lead_replaces_the_first(self):
        t = self.team()
        r = self.post(f"{BASE}teams/{t['id']}/members/", {"name": "Imran", "phone": "+91 98251 52021", "role": "Lead"}, as_=self.ops)
        self.assertEqual(r.status_code, 201, r.data)
        roles = {m["name"]: m["role"] for m in r.data["data"]["members"]}
        self.assertEqual(roles, {"Ravi Kumar": "Driver", "Imran": "Lead"})
        self.assertEqual(PickupPartner.objects.get(public_id=t["id"]).lead_name, "Imran")
        self.assertEqual(PickupTeamMember.objects.filter(team__public_id=t["id"], role="Lead").count(), 1)

    def test_lead_on_leave_stops_the_team_taking_work_only_when_pickups_are_booked(self):
        t = self.team()
        lead = t["members"][0]["id"]
        r = self.post(f"{BASE}teams/{t['id']}/members/{lead}/status/", {"status": "On leave"}, as_=self.ops)
        self.assertEqual(r.status_code, 200, r.data)  # nothing booked, so fine
        r = self.post(f"{BASE}teams/{t['id']}/members/{lead}/make-lead/", {}, as_=self.ops)
        self.assertEqual(r.data["data"]["members"][0]["status"], "Active")

    def test_pause_needs_a_reason_and_resume_needs_a_lead(self):
        t = self.team()
        self.assertEqual(self.post(f"{BASE}teams/{t['id']}/status/", {"status": "Paused"}, as_=self.ops).status_code, 400)
        r = self.post(f"{BASE}teams/{t['id']}/status/", {"status": "Paused", "reason": "Vehicle in repair"}, as_=self.ops)
        self.assertEqual((r.data["data"]["status"], r.data["data"]["pausedReason"]), ("Paused", "Vehicle in repair"))
        self.assertEqual(PickupPartner.objects.get(public_id=t["id"]).status, "Inactive")
        r = self.post(f"{BASE}teams/{t['id']}/status/", {"status": "Active"}, as_=self.ops)
        self.assertEqual(r.data["data"]["status"], "Active")
        lead = t["members"][0]["id"]
        self.post(f"{BASE}teams/{t['id']}/members/{lead}/status/", {"status": "On leave"}, as_=self.ops)
        self.post(f"{BASE}teams/{t['id']}/status/", {"status": "Paused", "reason": "No lead for now"}, as_=self.ops)
        r = self.post(f"{BASE}teams/{t['id']}/status/", {"status": "Active"}, as_=self.ops)
        self.assertEqual((r.status_code, r.data["code"]), (409, "NO_LEAD"))

    def test_a_team_with_history_keeps_its_name_and_cannot_be_deleted(self):
        from apps.donations.models import Donation
        t = self.team()
        p = PickupPartner.objects.get(public_id=t["id"])
        donor = self.make_user("d@example.com")
        Donation.objects.create(donor=donor, title="Chair", category="Furniture", description="A chair.",
                                condition="Good", pickup_address={}, contact_name="D", phone="9876543210",
                                assigned_partner=p)
        body = {"name": "Renamed", "area": "East", "vehicle": "Maruti Eeco van", "capacity": 7}
        r = self.patch(f"{BASE}teams/{t['id']}/", body, as_=self.ops)
        self.assertEqual((r.data["data"]["name"], r.data["data"]["area"], r.data["data"]["capacity"]),
                         ("Pickup team A", "East", 7))
        r = self.delete(f"{BASE}teams/{t['id']}/", as_=self.ops)
        self.assertEqual((r.status_code, r.data["code"]), (409, "HAS_HISTORY"))

    def test_unused_team_can_be_deleted_and_move_member(self):
        a, b = self.team(), self.team(name="Pickup team B", lead="Imran", phone="+91 98251 52021")
        extra = self.post(f"{BASE}teams/{a['id']}/members/", {"name": "Kanta", "phone": "+91 98252 63032", "role": "Helper"}, as_=self.ops)
        member = extra.data["data"]["members"][-1]["id"]
        r = self.post(f"{BASE}teams/{a['id']}/members/{member}/move/", {"to": b["id"]}, as_=self.ops)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(PickupTeamMember.objects.filter(team__public_id=b["id"]).count(), 2)
        self.assertEqual(self.delete(f"{BASE}teams/{b['id']}/", as_=self.ops).status_code, 200)
        self.assertFalse(PickupPartner.objects.filter(public_id=b["id"]).exists())


class ItemPickupTests(PickupBase):
    def setUp(self):
        super().setUp()
        self.seller = self.make_user("seller@example.com")
        cat = Category.objects.create(name="Furniture", slug="furniture", applies_to="Both")
        self.item = Item.objects.create(
            user=self.seller, category=cat, title="Brass lamp", description="Old brass lamp, works well.",
            condition="Good", quantity=1, listing_price=1000, pickup_preference="Platform_Pickup",
            item_status="Listed", city="Surat", pincode="395003")
        self.team_row = self.team()

    def request(self):
        from . import services
        return services.request_for_item(self.item)

    def act(self, r, key, **body):
        return self.post(f"{BASE}requests/{r.public_id}/{key}/", body, as_=self.ops)

    def test_one_request_per_listing_and_only_for_platform_pickup(self):
        r = self.request()
        self.assertEqual(self.request().pk, r.pk)
        self.assertEqual(PickupRequest.objects.count(), 1)
        from . import services
        other2 = Item.objects.create(
            user=self.seller, category=self.item.category, title="Rug", description="Wool rug in good shape.",
            condition="Good", quantity=1, listing_price=500, pickup_preference="Seller_Handover",
            item_status="Listed", city="Surat", pincode="395003")
        self.assertIsNone(services.request_for_item(other2))

    def test_list_shows_the_listing_and_seller(self):
        r = self.request()
        data = self.get(f"{BASE}requests/", as_=self.ops).data["data"]
        self.assertEqual(data["count"], 1)
        row = data["results"][0]
        self.assertEqual((row["id"], row["status"], row["item"]["title"], row["customer"]["email"]),
                         (r.public_id, "Requested", "Brass lamp", "seller@example.com"))

    def test_full_journey(self):
        r = self.request()
        ok = self.act(r, "schedule", date=day(), slot=SLOT, partner="Pickup team A")
        self.assertEqual(ok.status_code, 200, ok.data)
        self.assertEqual((ok.data["data"]["status"], ok.data["data"]["partner"]), ("Scheduled", "Pickup team A"))
        self.assertEqual(self.act(r, "complete").status_code, 409)  # not picked up yet
        self.assertEqual(self.act(r, "pickedUp").data["data"]["status"], "Picked_Up")
        done = self.act(r, "complete")
        self.assertEqual(done.data["data"]["status"], "Completed")
        labels = [e["label"] for e in done.data["data"]["events"]]
        self.assertEqual(labels, ["Pickup requested", "Pickup scheduled", "Picked up from customer", "Delivered to warehouse"])
        self.assertEqual(self.act(r, "cancel", reason="Changed my mind").status_code, 409)

    def test_schedule_rules(self):
        r = self.request()
        self.assertEqual(self.act(r, "schedule", date=day(), slot=SLOT).status_code, 400)  # no team
        self.assertEqual(self.act(r, "schedule", date=day(-3), slot=SLOT, partner="Pickup team A").status_code, 400)
        self.post(f"{BASE}teams/{self.team_row['id']}/status/", {"status": "Paused", "reason": "Repairs"}, as_=self.ops)
        self.assertEqual(self.act(r, "schedule", date=day(), slot=SLOT, partner="Pickup team A").status_code, 400)

    def test_cancel_and_reopen(self):
        r = self.request()
        self.assertEqual(self.act(r, "cancel", reason="no").status_code, 400)
        c = self.act(r, "cancel", reason="Seller is away")
        self.assertEqual((c.data["data"]["status"], c.data["data"]["cancel_reason"]), ("Cancelled", "Seller is away"))
        self.assertEqual(self.act(r, "reopen").data["data"]["status"], "Requested")

    def test_pausing_a_team_moves_its_booked_pickups(self):
        r = self.request()
        other = self.team(name="Pickup team B", lead="Imran", phone="+91 98251 52021")
        self.act(r, "schedule", date=day(), slot=SLOT, partner="Pickup team A")
        tid = self.team_row["id"]
        blocked = self.post(f"{BASE}teams/{tid}/status/", {"status": "Paused", "reason": "Vehicle repair"}, as_=self.ops)
        self.assertEqual((blocked.status_code, blocked.data["code"]), (409, "HAS_PICKUPS"))
        moved = self.post(f"{BASE}teams/{tid}/status/",
                          {"status": "Paused", "reason": "Vehicle repair", "move_to": other["id"]}, as_=self.ops)
        self.assertEqual(moved.status_code, 200, moved.data)
        r.refresh_from_db()
        self.assertEqual(r.assigned_partner.public_id, other["id"])

    def test_needs_the_pickups_module(self):
        r = self.request()
        self.assertEqual(self.get(f"{BASE}requests/", as_=self.nobody).status_code, 403)
        self.assertEqual(self.post(f"{BASE}requests/{r.public_id}/cancel/", {"reason": "x" * 6}, as_=self.viewer).status_code, 403)
