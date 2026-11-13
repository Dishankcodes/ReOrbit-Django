"""Orbit Points, the voucher catalogue, redeeming, and what admins can change."""

from datetime import timedelta

from django.utils import timezone

from apps.donations.models import Donation
from apps.orders.models import Order
from apps.orders.tests_post_delivery import PostDeliveryBase

from . import services as rewards
from .models import PointsEntry, RewardOffer, RewardRule, Voucher


def offer_body(**over):
    today = timezone.localdate()
    body = {"code": "TESTOFF", "title": "Test voucher", "description": "For tests", "kind": "points", "discount_type": "fixed",
            "value": 50, "min_order": 100, "points_cost": 100, "usage_limit": 5, "per_user": 1, "audience": "all", "min_level": 0,
            "valid_from": today.isoformat(), "valid_to": (today + timedelta(days=30)).isoformat()}
    body.update(over)
    return body


class RewardsBase(PostDeliveryBase):
    def setUp(self):
        super().setUp()
        self.rw = self.make_admin("rw@example.com", modules={"rewards": "edit"})
        self.rw_view = self.make_admin("rwv@example.com", modules={"rewards": "view"})

    def delivered(self, item=None):
        item = item or self.table
        oid = self.place(item)
        self.deliver(oid, item)
        return oid

    def balance(self, who=None):
        return rewards.totals(who or self.buyer)[0]

    def give(self, points, who=None):
        r = self.post(f"/api/rewards/admin/users/{(who or self.buyer).public_id}/adjust/", {"amount": points, "reason": "Test grant"}, as_=self.rw)
        self.assertEqual(r.status_code, 200, r.data)


class EarningTests(RewardsBase):
    def test_default_rules_are_seeded(self):
        keys = set(RewardRule.objects.values_list("key", flat=True))
        self.assertEqual(keys, {"purchase", "firstOrder", "donationBase", "donationItem", "listing", "review", "referral", "follow"})
        got = self.get("/api/rewards/me/rules/", as_=self.buyer).data["data"]["rules"]
        live = {r["id"]: r["live"] for r in got}
        self.assertTrue(live["purchase"])
        self.assertFalse(live["referral"])

    def test_a_delivered_order_earns_points_once(self):
        self.delivered()  # Teak table ₹2,400 -> 24 x 10 + 50 first order bonus
        self.assertEqual(self.balance(), 24 * 10 + 50)
        order = Order.objects.get()
        rewards.on_order_delivered(order)  # a replay changes nothing
        self.assertEqual(self.balance(), 290)
        self.delivered(self.tote)  # ₹500 -> 50, no second first-order bonus
        self.assertEqual(self.balance(), 290 + 50)
        kinds = list(PointsEntry.objects.order_by("pk").values_list("kind", flat=True))
        self.assertEqual(kinds, ["purchase", "firstOrder", "purchase"])

    def test_nothing_is_earned_before_delivery(self):
        self.place(self.table)
        self.assertEqual(self.balance(), 0)

    def test_sellers_and_remakers_do_not_earn_for_what_they_sell(self):
        self.delivered()
        self.assertEqual(self.balance(self.seller), 0)

    def test_a_switched_off_rule_earns_nothing(self):
        r = self.patch("/api/rewards/admin/rules/purchase/", {"active": False}, as_=self.rw)
        self.assertEqual(r.status_code, 200, r.data)
        self.delivered()
        self.assertEqual(self.balance(), 50)  # only the first-order bonus
        self.patch("/api/rewards/admin/rules/purchase/", {"points": 5, "active": True}, as_=self.rw)
        self.delivered(self.tote)
        self.assertEqual(self.balance(), 50 + 5 * 5)

    def test_a_return_takes_the_points_back(self):
        oid = self.delivered()
        order = Order.objects.get(public_id=oid)
        rewards.on_order_returned(order, order.total)
        self.assertEqual(self.balance(), 50)  # the purchase points are gone, the bonus stays
        rewards.on_order_returned(order, order.total)  # twice changes nothing
        self.assertEqual(self.balance(), 50)

    def test_a_review_earns_points_but_an_edit_does_not(self):
        oid = self.delivered(self.lamp)
        before = self.balance()
        url = f"/api/reviews/me/orders/{oid}/items/{self.lamp.public_id}/product/"
        r = self.client.post(url, {"rating": 5}, format="multipart", **self._headers(self.buyer))
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(self.balance(), before + 20)
        self.client.post(url, {"rating": 4}, format="multipart", **self._headers(self.buyer))
        self.assertEqual(self.balance(), before + 20)

    def test_publishing_a_listing_earns_points_once(self):
        item = self.lamp
        rewards.on_listing_published(self.seller, item)
        rewards.on_listing_published(self.seller, item)
        self.assertEqual(self.balance(self.seller), 30)

    def test_a_reward_bug_never_breaks_the_caller(self):
        from unittest import mock

        with mock.patch.object(rewards, "award", side_effect=RuntimeError("boom")):
            oid = self.delivered()  # the order still delivers
        self.assertEqual(Order.objects.get(public_id=oid).status, "Delivered")


class DonationPointsTests(RewardsBase):
    def donation(self, qty=3, status="Received"):
        return Donation.objects.create(user=self.buyer, title="Books", category="Furniture", description="Old books to give away",
                                       condition="Good", quantity=qty, weight_kg=6, address={}, contact_name="A", contact_phone="9876543210",
                                       status=status, received_at=timezone.now())

    def test_a_donation_pays_once(self):
        d = self.donation()
        self.assertEqual(rewards.on_donation_received(d), 100 + 20 * 3)
        self.assertEqual(rewards.on_donation_received(d), 160)
        self.assertEqual(self.balance(), 160)

    def test_admin_can_take_a_donation_reward_back_and_restore_it(self):
        d = self.donation()
        rewards.on_donation_received(d)
        v = rewards.issue_for_donation(d)
        url = f"/api/rewards/admin/donation-rewards/{d.public_id}"
        self.assertEqual(self.post(f"{url}/revoke/", {"reason": "x"}, as_=self.rw).status_code, 400)  # needs a reason
        self.assertEqual(self.post(f"{url}/revoke/", {"reason": "Item was fake"}, as_=self.rw).status_code, 200)
        self.assertEqual(self.balance(), 0)
        v.refresh_from_db()
        self.assertEqual(v.status, "Void")
        self.assertEqual(self.post(f"{url}/revoke/", {"reason": "Again"}, as_=self.rw).status_code, 409)
        rows = self.get("/api/rewards/admin/donation-rewards/", as_=self.rw).data["data"]["results"]
        self.assertEqual(rows[0]["status"], "Revoked")
        self.assertEqual(self.post(f"{url}/restore/", {}, as_=self.rw).status_code, 200)
        self.assertEqual(self.balance(), 160)
        v.refresh_from_db()
        self.assertEqual(v.status, "Active")

    def test_a_spent_voucher_is_not_taken_back(self):
        d = self.donation()
        rewards.on_donation_received(d)
        v = rewards.issue_for_donation(d)
        rewards.mark_used(v)
        self.post(f"/api/rewards/admin/donation-rewards/{d.public_id}/revoke/", {"reason": "Fraud check"}, as_=self.rw)
        v.refresh_from_db()
        self.assertEqual(v.status, "Used")


class RedeemTests(RewardsBase):
    def offer(self, **over):
        return rewards.save_offer(offer_body(**over), self.rw)

    def test_summary_levels_and_progress(self):
        self.give(600)
        s = self.get("/api/rewards/me/summary/", as_=self.buyer).data["data"]
        self.assertEqual((s["balance"], s["level"]["key"], s["next"]["key"], s["to_next"]), (600, "sprout", "orbiter", 900))
        self.assertEqual(s["progress"], round(100 * 100 / 1000))

    def test_redeeming_spends_points_and_gives_a_voucher(self):
        o = self.offer()
        self.give(250)
        r = self.post(f"/api/rewards/me/offers/{o.public_id}/redeem/", as_=self.buyer)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["data"]["balance"], 150)
        v = Voucher.objects.get(source_type="points")
        self.assertEqual((v.owner_id, v.amount, v.points_spent, v.status, v.min_order), (self.buyer.pk, 50, 100, "Active", 100))
        self.assertTrue(v.code.startswith("TESTOFF-"))
        spend = PointsEntry.objects.get(kind="spend")
        self.assertEqual((spend.points, spend.ref_id), (-100, v.public_id))
        mine = self.get("/api/rewards/me/vouchers/", as_=self.buyer).data["data"]
        self.assertEqual(mine["ready"], 1)
        again = self.post(f"/api/rewards/me/offers/{o.public_id}/redeem/", as_=self.buyer)  # per_user is 1
        self.assertEqual((again.status_code, again.data["code"]), (400, "PER_USER_LIMIT"))
        self.assertEqual(self.balance(), 150)

    def test_not_enough_points(self):
        o = self.offer(points_cost=500)
        self.give(100)
        r = self.post(f"/api/rewards/me/offers/{o.public_id}/redeem/", as_=self.buyer)
        self.assertEqual((r.status_code, r.data["code"]), (400, "NOT_ENOUGH_POINTS"))
        self.assertIn("400 more", r.data["message"])
        self.assertFalse(Voucher.objects.exists())

    def test_level_lock_pause_expiry_and_stock(self):
        self.give(5000)
        locked = self.offer(code="LOCKED", min_level=4)
        paused = self.offer(code="PAUSED", paused=True)
        draft = self.offer(code="DRAFTED", draft=True)
        gone = self.offer(code="GONE", usage_limit=1)
        Voucher.objects.create(owner=self.seller, code="GONE-AAAA", amount=50, expires_at=timezone.now() + timedelta(days=5),
                               source_type="points", source_id="RDM-X", offer=gone, points_spent=100)
        old = self.offer(code="OLD")
        RewardOffer.objects.filter(pk=old.pk).update(valid_to=timezone.localdate() - timedelta(days=1))
        results = {}
        for name, o in (("PAUSED", paused), ("DRAFTED", draft), ("GONE", gone), ("OLD", old)):
            results[name] = self.post(f"/api/rewards/me/offers/{o.public_id}/redeem/", as_=self.buyer).status_code
        self.assertEqual(results, {"PAUSED": 400, "DRAFTED": 400, "GONE": 400, "OLD": 400})
        self.assertEqual(self.post(f"/api/rewards/me/offers/{locked.public_id}/redeem/", as_=self.buyer).status_code, 201)  # 5,000 points is Champion
        self.assertEqual(Voucher.objects.filter(owner=self.buyer).count(), 1)

    def test_level_locked_for_a_new_member(self):
        o = self.offer(min_level=2)
        self.give(300)
        r = self.post(f"/api/rewards/me/offers/{o.public_id}/redeem/", as_=self.buyer)
        self.assertEqual((r.status_code, r.data["code"]), (400, "LEVEL_LOCKED"))

    def test_offers_list_says_why_something_is_locked(self):
        self.offer(code="EXPENSIVE", points_cost=900)
        rows = self.get("/api/rewards/me/offers/", as_=self.buyer).data["data"]["offers"]
        row = next(r for r in rows if r["code"] == "EXPENSIVE")
        self.assertFalse(row["can_redeem"])
        self.assertIn("900 more", row["reason"])
        self.assertTrue(all(r["status"] != "Draft" for r in rows))

    def test_a_cancelled_redemption_returns_the_points(self):
        o = self.offer()
        self.give(200)
        v = rewards.redeem(self.buyer, o.public_id)
        self.assertEqual(self.balance(), 100)
        r = self.post(f"/api/rewards/admin/redemptions/{v.public_id}/cancel/", {"reason": "Mistake"}, as_=self.rw)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(self.balance(), 200)
        self.assertEqual(self.post(f"/api/rewards/admin/redemptions/{v.public_id}/cancel/", {}, as_=self.rw).status_code, 409)
        v.refresh_from_db()
        self.assertEqual(v.status, "Void")

    def test_a_used_voucher_cannot_be_cancelled(self):
        o = self.offer()
        self.give(200)
        v = rewards.redeem(self.buyer, o.public_id)
        rewards.mark_used(v)
        r = self.post(f"/api/rewards/admin/redemptions/{v.public_id}/cancel/", {}, as_=self.rw)
        self.assertEqual(r.status_code, 409)
        self.assertEqual(self.balance(), 100)


class VoucherCheckTests(RewardsBase):
    def test_percent_discount_is_capped(self):
        o = rewards.save_offer(offer_body(code="PCT", kind="code", discount_type="percent", value=10, max_discount=150, min_order=0), self.rw)
        v, d = rewards.check(self.buyer, "pct", 1000)
        self.assertEqual(d, 100)
        v, d = rewards.check(self.buyer, "PCT", 5000)
        self.assertEqual(d, 150)
        self.assertIsNone(v.pk)  # only a quote: nothing saved
        self.assertEqual(o.vouchers.count(), 0)

    def test_a_coupon_is_claimed_inside_checkout_and_limited_per_member(self):
        o = rewards.save_offer(offer_body(code="ONCE", kind="code", usage_limit=10, per_user=1), self.rw)
        v, d = rewards.check(self.buyer, "ONCE", 1000, lock=True)
        self.assertIsNotNone(v.pk)
        rewards.mark_used(v)
        with self.assertRaises(rewards.VoucherError) as cm:
            rewards.check(self.buyer, "ONCE", 1000, lock=True)
        self.assertEqual(cm.exception.code, "VOUCHER_USED")
        other, _ = rewards.check(self.seller, "ONCE", 1000, lock=True)  # a different member can
        self.assertEqual(o.vouchers.count(), 2)
        rewards.restore(v)  # the checkout failed: the claim is cancelled and the member can try again
        v.refresh_from_db()
        self.assertEqual(v.status, "Void")
        rewards.check(self.buyer, "ONCE", 1000, lock=True)

    def test_a_coupon_stops_at_its_total_limit(self):
        rewards.save_offer(offer_body(code="TWO", kind="code", usage_limit=1, per_user=1), self.rw)
        v, _ = rewards.check(self.buyer, "TWO", 1000, lock=True)
        rewards.mark_used(v)
        with self.assertRaises(rewards.VoucherError) as cm:
            rewards.check(self.seller, "TWO", 1000, lock=True)
        self.assertEqual(cm.exception.code, "VOUCHER_USED_UP")

    def test_audience_dates_and_minimum(self):
        rewards.save_offer(offer_body(code="NEWONLY", kind="code", audience="new", min_order=500), self.rw)
        with self.assertRaises(rewards.VoucherError) as cm:
            rewards.check(self.buyer, "NEWONLY", 100)
        self.assertEqual(cm.exception.code, "VOUCHER_MIN_ORDER")
        self.assertEqual(rewards.check(self.buyer, "NEWONLY", 600)[1], 50)
        self.delivered()
        with self.assertRaises(rewards.VoucherError) as cm:
            rewards.check(self.buyer, "NEWONLY", 600)
        self.assertEqual(cm.exception.code, "VOUCHER_AUDIENCE")
        o = rewards.save_offer(offer_body(code="LATE", kind="code"), self.rw)
        RewardOffer.objects.filter(pk=o.pk).update(valid_from=timezone.localdate() + timedelta(days=2))
        with self.assertRaises(rewards.VoucherError):
            rewards.check(self.seller, "LATE", 600)
        RewardOffer.objects.filter(pk=o.pk).update(valid_from=timezone.localdate() - timedelta(days=9), valid_to=timezone.localdate() - timedelta(days=1))
        with self.assertRaises(rewards.VoucherError) as cm:
            rewards.check(self.seller, "LATE", 600)
        self.assertEqual(cm.exception.code, "VOUCHER_EXPIRED")

    def test_vouchers_belong_to_one_member_and_expire(self):
        v = Voucher.objects.create(owner=self.buyer, code="RO-OWNED01", amount=100, min_order=0, expires_at=timezone.now() + timedelta(days=3),
                                   source_type="donation", source_id="DON-1")
        with self.assertRaises(rewards.VoucherError):
            rewards.check(self.seller, "RO-OWNED01", 500)
        Voucher.objects.filter(pk=v.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
        with self.assertRaises(rewards.VoucherError) as cm:
            rewards.check(self.buyer, "RO-OWNED01", 500)
        self.assertEqual(cm.exception.code, "VOUCHER_EXPIRED")
        self.assertEqual(self.get("/api/rewards/me/vouchers/", as_=self.buyer).data["data"]["vouchers"][0]["status"], "Expired")

    def test_split_discount_adds_up(self):
        self.assertEqual(sum(rewards.split_discount(100, [2400, 500, 700])), 100)
        self.assertEqual(rewards.split_discount(10, [1]), [10])


class AdminRewardsTests(RewardsBase):
    def test_permissions(self):
        for url in ("/api/rewards/admin/rules/", "/api/rewards/admin/offers/", "/api/rewards/admin/users/", "/api/rewards/admin/redemptions/",
                    "/api/rewards/admin/donation-rewards/"):
            self.assertEqual(self.get(url, as_=self.buyer).status_code, 403, url)  # a member
            self.assertEqual(self.get(url, as_=self.maker).status_code, 403, url)  # a ReMaker
            self.assertEqual(self.get(url, as_=self.fin).status_code, 403, url)    # an admin without the module
            self.assertIn(self.get(url).status_code, (401, 403), url)
            self.assertEqual(self.get(url, as_=self.rw_view).status_code, 200, url)
        self.assertEqual(self.patch("/api/rewards/admin/rules/purchase/", {"points": 99}, as_=self.rw_view).status_code, 403)
        self.assertEqual(self.post("/api/rewards/admin/offers/", offer_body(), as_=self.rw_view).status_code, 403)
        self.assertEqual(RewardRule.objects.get(key="purchase").points, 10)

    def test_a_member_only_sees_their_own_points(self):
        self.give(100)
        self.assertEqual(self.get("/api/rewards/me/ledger/", as_=self.seller).data["data"]["results"], [])
        self.assertEqual(len(self.get("/api/rewards/me/ledger/", as_=self.buyer).data["data"]["results"]), 1)

    def test_rule_validation(self):
        self.assertEqual(self.patch("/api/rewards/admin/rules/purchase/", {"points": -5}, as_=self.rw).status_code, 400)
        self.assertEqual(self.patch("/api/rewards/admin/rules/purchase/", {"points": "abc"}, as_=self.rw).status_code, 400)
        self.assertEqual(self.patch("/api/rewards/admin/rules/nope/", {"points": 5}, as_=self.rw).status_code, 404)
        r = self.patch("/api/rewards/admin/rules/purchase/", {"points": 12}, as_=self.rw)
        self.assertEqual(r.data["data"]["rule"]["points"], 12)

    def test_create_validates_and_codes_are_unique(self):
        bad = self.post("/api/rewards/admin/offers/", offer_body(code="x", value=0, points_cost=0, valid_to="2000-01-01"), as_=self.rw)
        self.assertEqual(bad.status_code, 400)
        self.assertTrue({"code", "value", "points_cost", "valid_to"} <= set(bad.data["errors"]))
        ok = self.post("/api/rewards/admin/offers/", offer_body(), as_=self.rw)
        self.assertEqual(ok.status_code, 201, ok.data)
        dup = self.post("/api/rewards/admin/offers/", offer_body(code="testoff"), as_=self.rw)
        self.assertIn("code", dup.data["errors"])
        pct = self.post("/api/rewards/admin/offers/", offer_body(code="PCT5", kind="code", discount_type="percent", value=150), as_=self.rw)
        self.assertIn("value", pct.data["errors"])

    def test_pause_and_delete_rules(self):
        oid = self.post("/api/rewards/admin/offers/", offer_body(), as_=self.rw).data["data"]["offer"]["id"]
        r = self.patch(f"/api/rewards/admin/offers/{oid}/", {"paused": True}, as_=self.rw)
        self.assertEqual((r.status_code, r.data["data"]["offer"]["status"]), (200, "Paused"))
        self.give(500)
        self.patch(f"/api/rewards/admin/offers/{oid}/", {"paused": False}, as_=self.rw)
        self.assertEqual(self.post(f"/api/rewards/me/offers/{oid}/redeem/", as_=self.buyer).status_code, 201)
        gone = self.delete(f"/api/rewards/admin/offers/{oid}/", as_=self.rw)
        self.assertEqual((gone.status_code, gone.data["code"]), (409, "IN_USE"))  # members hold it: pause, don't delete
        spare = self.post("/api/rewards/admin/offers/", offer_body(code="SPARE"), as_=self.rw).data["data"]["offer"]["id"]
        self.assertEqual(self.delete(f"/api/rewards/admin/offers/{spare}/", as_=self.rw).status_code, 200)
        lst = self.get("/api/rewards/admin/offers/", as_=self.rw).data["data"]["offers"]
        self.assertEqual(next(o for o in lst if o["id"] == oid)["used"], 1)

    def test_adjusting_points(self):
        self.assertEqual(self.post(f"/api/rewards/admin/users/{self.buyer.public_id}/adjust/", {"amount": 0, "reason": "none"}, as_=self.rw).status_code, 400)
        self.assertEqual(self.post(f"/api/rewards/admin/users/{self.buyer.public_id}/adjust/", {"amount": 50}, as_=self.rw).status_code, 400)  # no reason
        self.give(80)
        below = self.post(f"/api/rewards/admin/users/{self.buyer.public_id}/adjust/", {"amount": -200, "reason": "Too much"}, as_=self.rw)
        self.assertEqual((below.status_code, below.data["code"]), (400, "BELOW_ZERO"))
        ok = self.post(f"/api/rewards/admin/users/{self.buyer.public_id}/adjust/", {"amount": -30, "reason": "Duplicate order"}, as_=self.rw)
        self.assertEqual(ok.data["data"]["balance"], 50)
        ledger = self.get(f"/api/rewards/admin/users/{self.buyer.public_id}/ledger/", as_=self.rw).data["data"]["results"]
        self.assertEqual([e["points"] for e in ledger], [-30, 80])
        self.assertEqual(ledger[0]["admin"], "Test Admin")
        self.assertEqual(self.post("/api/rewards/admin/users/USR-9999999/adjust/", {"amount": 1, "reason": "abc"}, as_=self.rw).status_code, 404)

    def test_user_list_has_balances_and_a_breakdown(self):
        self.delivered()
        self.give(100)
        rows = self.get("/api/rewards/admin/users/?q=buyer", as_=self.rw).data["data"]["results"]
        row = rows[0]
        self.assertEqual((row["id"], row["balance"], row["lifetime"], row["purchases"], row["spent"]), (self.buyer.public_id, 390, 390, 290, 0))
        self.assertEqual(row["level"]["key"], "seedling")
