"""Complaints: filing by members, the team's workflow, and the real effects of each decision."""

from apps.admins.models import AdminItem
from apps.core.models import Category, Notification
from apps.core.testing import APIBase
from apps.listings.models import Item
from apps.remakers.models import RemakerProduct
from apps.users.models import Users

from .models import Complaint, ComplaintWarning

ME = "/api/complaints/me/"
ADM = "/api/complaints/admin/"


class ComplaintBase(APIBase):
    def setUp(self):
        super().setUp()
        self.boss = self.make_admin("boss@example.com", modules={"complaints": "edit"})
        self.second = self.make_admin("second@example.com", modules={"complaints": "edit"})
        self.viewer = self.make_admin("view@example.com", modules={"complaints": "view"})
        self.nobody = self.make_admin("none@example.com", modules={"orders": "edit"})
        self.reporter = self.make_user("reporter@example.com")
        self.seller = self.make_user("seller@example.com")
        self.maker = self.make_remaker("maker@example.com", "Maker One")
        cat = Category.objects.create(name="Furniture", slug="furniture", applies_to="Both")
        self.cat = cat
        self.item = Item.objects.create(
            user=self.seller, category=cat, title="Brass lamp", description="Old brass lamp, works well.",
            condition="Good", quantity=1, listing_price=1000, pickup_preference="Seller_Handover",
            item_status="Listed", city="Surat", pincode="395003")
        self.product = RemakerProduct.objects.create(
            remaker=self.maker, category=cat, title="Teak stool", description="Hand made.", price=2000, stock=3,
            status="Listed")

    def report(self, who=None, **over):
        body = {"type": "User", "target_id": self.seller.public_id, "category": "Scam or fraud",
                "description": "Asked me to pay in advance outside ReOrbit."}
        body.update(over)
        return self.post(ME, body, as_=who or self.reporter)

    def filed(self, **over):
        r = self.report(**over)
        self.assertEqual(r.status_code, 201, r.data)
        return Complaint.objects.get(public_id=r.data["data"]["id"])

    def act(self, c, key, as_=None, **body):
        return self.post(f"{ADM}{c.public_id}/{key}/", body, as_=as_ or self.boss)


class FilingTests(ComplaintBase):
    def test_a_member_files_and_the_team_is_told(self):
        c = self.filed()
        self.assertEqual((c.status, c.source, c.reporter_role, c.target_user_id), ("Open", "member", "User", self.seller.pk))
        self.assertEqual(c.events.get().label, "Complaint filed")
        self.assertTrue(Notification.objects.filter(admin=self.boss, module="complaints").exists())
        self.assertFalse(Notification.objects.filter(admin=self.nobody, module="complaints").exists())

    def test_a_remaker_can_report_a_listing_and_a_remaker(self):
        c = self.filed(who=self.maker, type="Product", target_id=self.item.public_id,
                       category="Unrealistic price")
        self.assertEqual((c.target_item_id, c.reporter_role), (self.item.pk, "ReMaker"))
        c2 = self.filed(who=self.reporter, type="ReMaker", target_id=self.maker.public_id, category="Late delivery")
        self.assertEqual(c2.target_remaker_id, self.maker.pk)

    def test_the_reporter_sees_their_reports_and_the_answer(self):
        c = self.filed()
        mine = self.get("/api/complaints/me/", as_=self.reporter).data["data"]["results"]
        self.assertEqual([r["id"] for r in mine], [c.public_id])
        self.assertIsNone(mine[0]["answer"])
        self.assertEqual(self.act(c, "dismiss", reason="No rule was broken here").status_code, 200)
        mine = self.get("/api/complaints/me/", as_=self.reporter).data["data"]["results"]
        self.assertEqual(mine[0]["status"], "Dismissed")
        self.assertIn("No rule was broken", mine[0]["answer"]["note"])
        self.assertEqual(self.get("/api/complaints/me/", as_=self.maker).data["data"]["results"], [])

    def test_validation(self):
        self.assertEqual(self.report(description="short").status_code, 400)
        self.assertEqual(self.report(category="Made up").status_code, 400)
        self.assertEqual(self.report(target_id="USR-9999").status_code, 404)
        self.assertEqual(self.report(target_id=self.maker.public_id).status_code, 404)  # id doesn't fit the type
        r = self.report(type="Review", target_id="PRV-1001")
        self.assertEqual(r.status_code, 400)  # reviews are reported from the review itself
        self.assertEqual(self.post(ME, {}, as_=self.boss).status_code, 403)  # admins don't file
        self.assertEqual(self.post(ME, {}).status_code, 401)

    def test_cannot_report_yourself_or_your_own_listing(self):
        self.assertEqual(self.report(who=self.seller).status_code, 409)
        r = self.report(who=self.seller, type="Product", target_id=self.item.public_id, category="Other")
        self.assertEqual((r.status_code, r.data["code"]), (409, "OWN_TARGET"))

    def test_same_report_twice_while_open_is_refused(self):
        self.filed()
        r = self.report()
        self.assertEqual((r.status_code, r.data["code"]), (409, "DUPLICATE"))
        self.assertEqual(self.report(category="Spam").status_code, 201)

    def test_daily_limit(self):
        for i in range(10):
            u = self.make_user(f"t{i}@example.com")
            self.assertEqual(self.report(target_id=u.public_id).status_code, 201)
        extra = self.make_user("extra@example.com")
        self.assertEqual(self.report(target_id=extra.public_id).status_code, 429)


class AdminListTests(ComplaintBase):
    def test_access(self):
        self.assertEqual(self.get(ADM).status_code, 401)
        self.assertEqual(self.get(ADM, as_=self.nobody).status_code, 403)
        self.assertEqual(self.get(ADM, as_=self.viewer).status_code, 200)
        c = self.filed()
        self.assertEqual(self.act(c, "start", as_=self.viewer).status_code, 403)
        self.assertEqual(self.post(ADM, {}, as_=self.viewer).status_code, 403)

    def test_list_carries_the_target_and_history(self):
        c = self.filed()
        self.filed(who=self.maker, type="Product", target_id=self.item.public_id, category="Unrealistic price")
        data = self.get(ADM, as_=self.boss).data["data"]
        self.assertEqual(data["count"], 2)
        by_id = {r["id"]: r for r in data["results"]}
        row = by_id[c.public_id]
        self.assertEqual((row["type"], row["target"]["name"], row["target"]["status"], row["reporter"]["name"]),
                         ("User", "Test User", "Active", "Test User"))
        prod = next(r for r in data["results"] if r["type"] == "Product")
        self.assertEqual((prod["target"]["name"], prod["target"]["live"], prod["target"]["canRemove"],
                          prod["target"]["owner"]["id"]), ("Brass lamp", True, True, self.seller.public_id))

    def test_targets_for_the_log_form(self):
        data = self.get(f"{ADM}targets/", as_=self.boss).data["data"]
        self.assertIn(self.seller.public_id, [t["id"] for t in data["User"]])
        self.assertIn(self.maker.public_id, [t["id"] for t in data["ReMaker"]])
        self.assertTrue({self.item.public_id, self.product.public_id} <= {t["id"] for t in data["Product"]})

    def test_admin_logs_one_by_hand(self):
        r = self.post(ADM, {"type": "Product", "targetId": self.product.public_id, "category": "Misleading photos or description",
                            "description": "Caller said the legs are cracked.", "reporterName": "Caller",
                            "reporterRole": "User"}, as_=self.boss)
        self.assertEqual(r.status_code, 201, r.data)
        c = Complaint.objects.get(public_id=r.data["data"]["id"])
        self.assertEqual((c.source, c.logged_by_id, c.reporter_name, c.target_remaker_product_id),
                         ("admin", self.boss.pk, "Caller", self.product.pk))
        self.assertEqual(c.events.get().label, "Complaint logged")


class WorkflowTests(ComplaintBase):
    def test_start_assign_note_dismiss_reopen(self):
        c = self.filed()
        r = self.act(c, "start")
        self.assertEqual((r.data["data"]["status"], r.data["data"]["assigneeId"]), ("Under_Review", self.boss.public_id))
        self.assertEqual(self.act(c, "start").status_code, 409)
        r = self.act(c, "assign", assigneeId=self.second.public_id)
        self.assertEqual(r.data["data"]["assigneeId"], self.second.public_id)
        self.assertTrue(Notification.objects.filter(admin=self.second, title__icontains="assigned").exists())
        self.assertEqual(self.act(c, "assign", assigneeId=self.nobody.public_id).status_code, 400)
        n = self.post(f"{ADM}{c.public_id}/notes/", {"text": "Spoke to the seller."}, as_=self.boss)
        self.assertEqual(n.data["data"]["notes"][0]["by"], "Test Admin")
        self.assertEqual(self.act(c, "dismiss", reason="no").status_code, 400)
        d = self.act(c, "dismiss", reason="No rule was broken")
        self.assertEqual((d.data["data"]["status"], d.data["data"]["resolution"]["action"]), ("Dismissed", "dismissed"))
        self.assertEqual(self.act(c, "warn", message="x" * 20).status_code, 409)  # closed
        self.assertTrue(Notification.objects.filter(user=self.reporter, module="complaints").exists())
        self.assertEqual(self.act(c, "reopen").data["data"]["status"], "Open")
        self.assertEqual(self.act(c, "reopen").status_code, 409)  # already open

    def test_warning_is_kept_and_sent(self):
        c = self.filed()
        self.assertEqual(self.act(c, "warn", message="too short").status_code, 400)
        msg = "Hi, please do not ask buyers to pay outside ReOrbit."
        r = self.act(c, "warn", message=msg)
        self.assertEqual((r.data["data"]["status"], r.data["data"]["resolution"]["action"]), ("Resolved", "warned"))
        self.assertEqual(ComplaintWarning.objects.get().message, msg)
        self.assertTrue(Notification.objects.filter(user=self.seller, title="A warning from ReOrbit").exists())
        later = self.filed(who=self.maker, category="Spam")
        shown = next(x for x in self.get(ADM, as_=self.boss).data["data"]["results"] if x["id"] == later.public_id)
        self.assertEqual([w["message"] for w in shown["warnings"]], [msg])  # one person, one history

    def test_suspend_and_block_really_change_the_account(self):
        c = self.filed()
        r = self.act(c, "suspend", reason="Asked for money outside ReOrbit")
        self.assertEqual(r.status_code, 200, r.data)
        self.seller.refresh_from_db()
        self.assertEqual(self.seller.status, "Suspended")
        self.assertEqual(r.data["data"]["resolution"]["action"], "suspended")
        self.assertTrue(Notification.objects.filter(user=self.seller, severity="critical").exists())
        c2 = self.filed(who=self.maker, category="Spam")
        self.assertEqual(self.act(c2, "suspend", reason="Already suspended").status_code, 409)
        self.act(c2, "block", reason="Repeated scam attempts")
        self.seller.refresh_from_db()
        self.assertEqual(self.seller.status, "Blocked")

    def test_also_resolve_closes_the_other_open_ones_about_the_same_person(self):
        a = self.filed()
        b = self.filed(who=self.maker, category="Spam")
        other = self.filed(who=self.maker, target_id=self.reporter.public_id, category="Spam")
        r = self.act(a, "suspend", reason="Clear scam pattern", alsoResolve=True)
        self.assertEqual(r.status_code, 200)
        b.refresh_from_db(); other.refresh_from_db()
        self.assertEqual((b.status, other.status), ("Resolved", "Open"))
        self.assertIn(a.public_id, b.resolution_note)

    def test_removing_a_listing_switches_it_off_for_real(self):
        c = self.filed(who=self.maker, type="Product", target_id=self.item.public_id, category="Prohibited or unsafe item")
        self.assertEqual(self.act(c, "removeProduct", reason="no").status_code, 400)
        r = self.act(c, "removeProduct", reason="Unsafe electrical item")
        self.assertEqual(r.status_code, 200, r.data)
        self.item.refresh_from_db()
        self.assertEqual((self.item.moderation_status, self.item.moderation_note), ("Disabled", "Unsafe electrical item"))
        self.assertFalse(r.data["data"]["target"]["live"])
        self.assertTrue(Notification.objects.filter(user=self.seller, title="Your listing was turned off").exists())

        p = self.filed(type="Product", target_id=self.product.public_id, category="Duplicate listing")
        self.act(p, "removeProduct", reason="Listed three times")
        self.product.refresh_from_db()
        self.assertEqual((self.product.status, self.product.deactivated_by_id), ("Inactive", self.boss.pk))

        store = AdminItem.objects.create(admin=self.boss, category=self.cat, title="Store chair", price=900, stock=2,
                                         status="Listed", sku="SKU-1")
        s = self.filed(type="Product", target_id=store.public_id, category="Already sold")
        self.assertEqual(self.act(s, "warn", message="This one is ReOrbit's own item.").status_code, 409)
        self.assertEqual(self.act(s, "suspend", reason="Nobody to suspend here").status_code, 409)
        self.act(s, "removeProduct", reason="Out of stock for good")
        store.refresh_from_db()
        self.assertEqual(store.status, "Inactive")

    def test_suspending_a_listing_owner_goes_through_the_listing(self):
        c = self.filed(who=self.maker, type="Product", target_id=self.item.public_id, category="Prohibited or unsafe item")
        self.act(c, "suspend", reason="Selling unsafe goods")
        self.seller.refresh_from_db()
        self.assertEqual(self.seller.status, Users.Status.SUSPENDED)


class CloseRightsTests(ComplaintBase):
    """Super Admins, anyone with Complaints edit access, and the assignee can close a complaint."""

    def test_mark_resolved_without_a_penalty(self):
        c = self.filed()
        self.assertEqual(self.act(c, "resolve").status_code, 400)  # a note is needed
        r = self.act(c, "resolve", reason="Spoke to both sides, refund agreed.")
        self.assertEqual(r.status_code, 200, r.data)
        c.refresh_from_db()
        self.assertEqual((c.status, c.resolution_action), ("Resolved", "resolved"))

    def test_super_admin_and_the_assignee_can_act(self):
        from apps.admins.models import Admins
        sup = self.make_admin("super@example.com", permission_level=Admins.PermissionLevel.SUPER_ADMIN)
        c = self.filed()
        self.assertEqual(self.act(c, "resolve", as_=self.viewer, reason="Handled it").status_code, 403)
        self.assertEqual(self.act(c, "assign", assigneeId=self.viewer.public_id).status_code, 200)
        r = self.act(c, "resolve", as_=self.viewer, reason="Handled it by phone")
        self.assertEqual(r.status_code, 200, r.data)
        c2 = self.filed(type="Product", target_id=self.item.public_id, category="Unrealistic price")
        self.assertEqual(self.act(c2, "resolve", as_=sup, reason="Checked and closed").status_code, 200)
