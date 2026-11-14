"""Product and seller reviews after a delivery."""

import shutil
import tempfile
from datetime import timedelta

from django.test import override_settings
from django.utils import timezone

from apps.core.tests.test_profile import image_file
from apps.orders.tests_post_delivery import PostDeliveryBase

from apps.core.models import Notification

from .models import ProductReview, ReviewReport, SellerReview

TMP = tempfile.mkdtemp(prefix="reorbit_test_reviews_")


@override_settings(MEDIA_ROOT=TMP)
class ReviewBase(PostDeliveryBase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TMP, ignore_errors=True)

    def delivered(self, item=None):
        item = item or self.lamp
        oid = self.place(item)
        self.deliver(oid, item)
        return oid, item.public_id

    def product_url(self, oid, ref):
        return f"/api/reviews/me/orders/{oid}/items/{ref}/product/"

    def rate_product(self, oid, ref, who=None, **body):
        body.setdefault("rating", 4)
        return self.client.post(self.product_url(oid, ref), body, format="multipart", **self._headers(who or self.buyer))


class ReviewTests(ReviewBase):
    def test_only_delivered_orders_can_be_reviewed(self):
        oid = self.place(self.lamp)
        ref = self.lamp.public_id
        r = self.rate_product(oid, ref)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["code"], "not_delivered")
        self.assertEqual(self.get("/api/reviews/me/", as_=self.buyer).data["data"]["results"], [])

    def test_product_review_create_edit_and_photos(self):
        oid, ref = self.delivered()
        r = self.rate_product(oid, ref, rating=5, title="Lovely", body="Shines.", quality=5, recommend="true",
                              photos=[image_file(), image_file(name="b.png")])
        self.assertEqual(r.status_code, 201, r.data)
        review = r.data["data"]["review"]
        self.assertEqual((review["rating"], review["title"], len(review["photos"])), (5, "Lovely", 2))
        self.assertEqual(ProductReview.objects.count(), 1)

        # editing updates the same review, removes a photo and adds one
        gone = review["photos"][0]["id"]
        r2 = self.client.post(self.product_url(oid, ref), {"rating": 3, "body": "Fine.", "remove_photos": [gone], "photos": [image_file()]},
                              format="multipart", **self._headers(self.buyer))
        self.assertEqual(r2.status_code, 201, r2.data)
        self.assertEqual(ProductReview.objects.count(), 1)
        edited = r2.data["data"]["review"]
        self.assertEqual((edited["rating"], len(edited["photos"])), (3, 2))
        self.assertIsNotNone(edited["edited_at"])

    def test_validation(self):
        oid, ref = self.delivered()
        self.assertEqual(self.rate_product(oid, ref, rating=0).status_code, 400)
        self.assertEqual(self.rate_product(oid, ref, rating=6).status_code, 400)
        r = self.client.post(self.product_url(oid, ref), {"rating": 4}, format="multipart", **self._headers(self.buyer))
        self.assertEqual(r.status_code, 201)
        r = self.rate_product(oid, ref, photos=[image_file() for _ in range(4)])
        self.assertEqual(r.status_code, 400)
        self.assertIn("photos", r.data["errors"])
        r = self.rate_product(oid, ref, quality=9)
        self.assertIn("quality", r.data["errors"])

    def test_only_the_buyer_can_review(self):
        oid, ref = self.delivered()
        self.assertEqual(self.rate_product(oid, ref, who=self.seller).status_code, 404)
        self.assertEqual(self.rate_product(oid, "NOPE-1").status_code, 404)

    def test_admins_cannot_review(self):
        r = self.get("/api/reviews/me/", as_=self.boss)
        self.assertEqual(r.status_code, 403)

    def test_edit_window(self):
        oid, ref = self.delivered()
        self.assertEqual(self.rate_product(oid, ref).status_code, 201)
        ProductReview.objects.update(created_at=timezone.now() - timedelta(days=31))
        r = self.rate_product(oid, ref, rating=1)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["code"], "edit_window_closed")

    def test_seller_review_for_a_member_and_a_remaker(self):
        oid, _ = self.delivered()  # lamp: sold by a member
        r = self.post(f"/api/reviews/me/orders/{oid}/seller/",
                      {"rating": 5, "communication": 5, "dispatch": 4, "tags": ["Friendly", "Nonsense"], "body": "Great."}, as_=self.buyer)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["data"]["review"]["tags"], ["Friendly"])
        sr = SellerReview.objects.get()
        self.assertEqual((sr.seller_type, sr.seller_user_id), ("user", self.seller.pk))
        # a second post edits it
        self.assertEqual(self.post(f"/api/reviews/me/orders/{oid}/seller/", {"rating": 4}, as_=self.buyer).status_code, 201)
        self.assertEqual(SellerReview.objects.count(), 1)

        oid2 = self.place(self.table)
        self.deliver(oid2, self.table)
        self.assertEqual(self.post(f"/api/reviews/me/orders/{oid2}/seller/", {"rating": 5}, as_=self.buyer).status_code, 201)
        self.assertEqual(SellerReview.objects.get(order__public_id=oid2).seller_remaker_id, self.maker.pk)

    def test_no_seller_review_for_the_reorbit_store(self):
        oid, ref = self.delivered(self.tote)
        r = self.post(f"/api/reviews/me/orders/{oid}/seller/", {"rating": 5}, as_=self.buyer)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["code"], "platform_seller")
        self.assertEqual(self.rate_product(oid, ref).status_code, 201)  # the product can still be reviewed
        row = self.get("/api/reviews/me/", as_=self.buyer).data["data"]["results"][0]
        self.assertFalse(row["can_review_seller"])
        self.assertTrue(row["complete"])

    def test_list_state(self):
        oid, ref = self.delivered()
        d = self.get("/api/reviews/me/", as_=self.buyer).data["data"]
        self.assertEqual(d["counts"], {"waiting": 1, "done": 0})
        self.rate_product(oid, ref)
        d = self.get("/api/reviews/me/", as_=self.buyer).data["data"]
        self.assertEqual(d["counts"], {"waiting": 1, "done": 0})  # the seller is still to rate
        self.post(f"/api/reviews/me/orders/{oid}/seller/", {"rating": 5}, as_=self.buyer)
        d = self.get("/api/reviews/me/", as_=self.buyer).data["data"]
        self.assertEqual(d["counts"], {"waiting": 0, "done": 1})
        row = d["results"][0]
        self.assertEqual((row["order_id"], row["line_id"], row["seller"]["type"]), (oid, ref, "user"))
        self.assertEqual(self.get("/api/reviews/me/", as_=self.seller).data["data"]["results"], [])  # not mine

    def test_seller_reads_and_answers_reviews(self):
        oid, _ = self.delivered()
        self.post(f"/api/reviews/me/orders/{oid}/seller/", {"rating": 5, "body": "Great."}, as_=self.buyer)
        got = self.get("/api/reviews/received/", as_=self.seller).data["data"]["results"]
        self.assertEqual(len(got), 1)
        rid = got[0]["id"]
        self.assertEqual(self.post(f"/api/reviews/received/{rid}/reply/", {"reply": "Thanks a lot!"}, as_=self.buyer).status_code, 404)
        self.assertEqual(self.post(f"/api/reviews/received/{rid}/reply/", {"reply": " "}, as_=self.seller).status_code, 400)
        ok = self.post(f"/api/reviews/received/{rid}/reply/", {"reply": "Thanks a lot!"}, as_=self.seller)
        self.assertEqual(ok.status_code, 200, ok.data)
        row = self.get("/api/reviews/me/", as_=self.buyer).data["data"]["results"][0]
        self.assertEqual(row["seller_review"]["reply"], "Thanks a lot!")


class ReviewFlowTests(ReviewBase):
    """Replies, reports, moderation, ratings, notifications and the public pages."""

    def setUp(self):
        super().setUp()
        self.mod = self.make_admin("rmod@example.com", modules={"complaints": "edit"})
        self.viewer = self.make_admin("rview@example.com", modules={"complaints": "view"})

    def reviewed(self, item=None, rating=5, seller=True):
        oid, ref = self.delivered(item)
        self.assertEqual(self.rate_product(oid, ref, rating=rating, title="Nice", body="Really good one.").status_code, 201)
        if seller and item is not self.tote:
            self.post(f"/api/reviews/me/orders/{oid}/seller/", {"rating": rating, "body": "Good seller."}, as_=self.buyer)
        return oid, ref

    def received(self, who):
        return self.get("/api/reviews/received/", as_=who).data["data"]["results"]

    # ---- notifications
    def test_seller_is_told_about_a_new_review_once(self):
        oid, ref = self.reviewed(self.table)
        got = Notification.objects.filter(remaker=self.maker, module="reviews")
        self.assertEqual(got.count(), 2)  # the product review and the seller review
        self.rate_product(oid, ref, rating=3)  # an edit is not "new"
        self.assertEqual(got.count(), 2)

    # ---- received list
    def test_received_shows_product_and_seller_reviews_with_privacy(self):
        self.reviewed(self.table)
        rows = self.received(self.maker)
        self.assertEqual(sorted(r["kind"] for r in rows), ["product", "seller"])
        prod = next(r for r in rows if r["kind"] == "product")
        self.assertEqual((prod["rating"], prod["product"]["title"], prod["status"]), (5, self.table.title, "Visible"))
        self.assertNotIn("email", prod["reviewer"])
        self.assertEqual(self.received(self.seller), [])  # the lamp seller got nothing
        self.assertEqual(self.get("/api/reviews/received/", as_=self.boss).status_code, 403)

    # ---- replies
    def test_reply_edit_delete_and_notifications(self):
        self.reviewed(self.table, seller=False)
        rid = self.received(self.maker)[0]["id"]
        url = f"/api/reviews/received/{rid}/reply/"
        self.assertEqual(self.post(url, {"reply": "short"}, as_=self.maker).status_code, 400)
        self.assertEqual(self.post(url, {"reply": "x" * 501}, as_=self.maker).status_code, 400)
        self.assertEqual(self.post(url, {"reply": "Thank you so much!"}, as_=self.seller).status_code, 404)
        r = self.post(url, {"reply": "Thank you so much!"}, as_=self.maker)
        self.assertEqual(r.data["data"]["review"]["reply"]["text"], "Thank you so much!")
        self.assertFalse(r.data["data"]["review"]["reply"]["edited"])
        self.assertEqual(Notification.objects.filter(user=self.buyer, title="The seller replied to your review").count(), 1)
        r = self.post(url, {"reply": "Thanks again, enjoy it!"}, as_=self.maker)
        self.assertTrue(r.data["data"]["review"]["reply"]["edited"])
        self.assertEqual(Notification.objects.filter(user=self.buyer, title="The seller replied to your review").count(), 1)
        # the buyer and the public see it
        self.assertEqual(self.get("/api/reviews/me/", as_=self.buyer).data["data"]["results"][0]["product_review"]["reply"], "Thanks again, enjoy it!")
        pub = self.client.get(f"/api/reviews/public/product/{self.table.public_id}/").data["data"]
        self.assertEqual(pub["results"][0]["reply"]["text"], "Thanks again, enjoy it!")
        d = self.client.delete(url, **self._headers(self.maker))
        self.assertEqual(d.status_code, 200)
        self.assertIsNone(self.received(self.maker)[0]["reply"])

    # ---- ratings
    def test_remaker_rating_follows_reviews_and_hiding(self):
        self.reviewed(self.table, rating=5)
        self.maker.refresh_from_db()
        self.assertEqual((float(self.maker.rating_average), self.maker.rating_count), (5.0, 2))
        oid, ref = self.delivered(self.table)
        self.rate_product(oid, ref, rating=2)
        self.maker.refresh_from_db()
        self.assertEqual(self.maker.rating_count, 3)
        self.assertEqual(float(self.maker.rating_average), 4.0)
        bad = next(r for r in self.received(self.maker) if r["rating"] == 2)
        self.post(f"/api/reviews/admin/{bad['id']}/hide/", {"reason": "Abusive language"}, as_=self.mod)
        self.maker.refresh_from_db()
        self.assertEqual((float(self.maker.rating_average), self.maker.rating_count), (5.0, 2))
        self.post(f"/api/reviews/admin/{bad['id']}/restore/", {}, as_=self.mod)
        self.maker.refresh_from_db()
        self.assertEqual(self.maker.rating_count, 3)

    # ---- public
    def test_public_pages_show_only_visible_reviews_with_first_name_and_initial(self):
        self.reviewed(self.lamp)
        pub = self.client.get(f"/api/reviews/public/product/{self.lamp.public_id}/").data["data"]
        self.assertEqual((pub["summary"]["count"], pub["summary"]["average"]), (1, 5.0))
        row = pub["results"][0]
        self.assertNotIn("email", row)
        self.assertNotIn("reviewer", row)
        seller = self.client.get(f"/api/reviews/public/seller/user/{self.seller.public_id}/").data["data"]
        self.assertEqual(seller["summary"]["count"], 2)
        rid = self.received(self.seller)[0]["id"]
        self.post(f"/api/reviews/admin/{rid}/hide/", {"reason": "Breaks the rules"}, as_=self.mod)
        seller = self.client.get(f"/api/reviews/public/seller/user/{self.seller.public_id}/").data["data"]
        self.assertEqual(seller["summary"]["count"], 1)
        self.assertEqual(self.client.get("/api/reviews/public/seller/user/USR-NOPE/").status_code, 404)
        self.assertEqual(self.client.get("/api/reviews/public/seller/admin/ADM-1/").status_code, 404)

    # ---- reports
    def test_report_withdraw_and_rules(self):
        self.reviewed(self.table, seller=False)
        rid = self.received(self.maker)[0]["id"]
        url = f"/api/reviews/{rid}/report/"
        self.assertEqual(self.post(url, {"reason": ""}, as_=self.maker).status_code, 400)
        self.assertEqual(self.post(url, {"reason": "Spam or advertising"}, as_=self.buyer).status_code, 403)  # your own review
        self.assertEqual(self.post(url, {"reason": "Spam or advertising"}, as_=self.mod).status_code, 403)  # admins don't report
        r = self.post(url, {"reason": "Spam or advertising", "note": "It is an ad."}, as_=self.maker)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(self.post(url, {"reason": "Other"}, as_=self.maker).status_code, 409)
        self.assertEqual(self.received(self.maker)[0]["report"]["status"], "Pending")
        self.assertEqual(self.client.delete(url, **self._headers(self.maker)).status_code, 200)
        self.assertIsNone(self.received(self.maker)[0]["report"])
        self.assertEqual(self.post(url, {"reason": "Spam or advertising"}, as_=self.maker).status_code, 201)
        self.assertEqual(self.post("/api/reviews/NOPE-1/report/", {"reason": "x"}, as_=self.maker).status_code, 404)

    def test_admin_queue_uphold_and_dismiss(self):
        self.reviewed(self.table, seller=False)
        oid2, ref2 = self.delivered(self.table)
        self.rate_product(oid2, ref2, rating=1, body="Awful.")
        rows = self.received(self.maker)
        a, b = rows[0]["id"], rows[1]["id"]
        for rid in (a, b):
            self.post(f"/api/reviews/{rid}/report/", {"reason": "Looks fake or paid for"}, as_=self.maker)
        q = self.get("/api/reviews/admin/?reported=1", as_=self.viewer).data["data"]
        self.assertEqual((q["count"], q["counts"]["reported"]), (2, 2))
        self.assertEqual(q["results"][0]["pending_reports"], 1)
        self.assertEqual(q["results"][0]["reviewer"]["email"], "buyer@example.com")
        rep_a = next(x for x in q["results"] if x["id"] == a)["reports"][0]["id"]
        rep_b = next(x for x in q["results"] if x["id"] == b)["reports"][0]["id"]
        self.assertEqual(self.post(f"/api/reviews/admin/reports/{rep_a}/resolve/", {"action": "dismiss"}, as_=self.viewer).status_code, 403)
        self.assertEqual(self.post(f"/api/reviews/admin/reports/{rep_a}/resolve/", {"action": "uphold", "note": "x"}, as_=self.mod).status_code, 400)
        self.assertEqual(self.post(f"/api/reviews/admin/reports/{rep_a}/resolve/", {"action": "dismiss", "note": "Fine."}, as_=self.mod).status_code, 200)
        self.assertEqual(self.post(f"/api/reviews/admin/reports/{rep_a}/resolve/", {"action": "dismiss"}, as_=self.mod).status_code, 409)
        r = self.post(f"/api/reviews/admin/reports/{rep_b}/resolve/", {"action": "uphold", "note": "Fake review."}, as_=self.mod)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["data"]["review"]["status"], "Hidden")
        self.assertEqual(ReviewReport.objects.filter(status="Pending").count(), 0)
        self.assertTrue(Notification.objects.filter(user=self.buyer, title="ReOrbit hid your review").exists())
        self.assertTrue(Notification.objects.filter(remaker=self.maker, title="We looked at your review report").count() == 2)
        # hidden: the buyer can't edit it, the seller can't reply, and it leaves the public page
        self.assertEqual(self.rate_product(oid2, ref2, rating=3).data["code"], "review_hidden")
        self.assertEqual(self.post(f"/api/reviews/received/{b}/reply/", {"reply": "Sorry about that!"}, as_=self.maker).status_code, 409)
        pub = self.client.get(f"/api/reviews/public/product/{self.table.public_id}/").data["data"]
        self.assertEqual(pub["summary"]["count"], 1)
        mine = self.get("/api/reviews/me/", as_=self.buyer).data["data"]["results"]
        hidden = next(m for m in mine if m["product_review"] and m["product_review"]["status"] == "Hidden")
        self.assertEqual(hidden["product_review"]["hidden_reason"], "Fake review.")
        # a settled report can't be withdrawn
        self.assertEqual(self.client.delete(f"/api/reviews/{b}/report/", **self._headers(self.maker)).status_code, 409)

    def test_admin_filters_and_access(self):
        self.reviewed(self.table)
        self.reviewed(self.lamp, rating=2)
        self.assertEqual(self.get("/api/reviews/admin/", as_=self.buyer).status_code, 403)
        q = lambda s: self.get(f"/api/reviews/admin/{s}", as_=self.viewer).data["data"]
        self.assertEqual(q("")["count"], 4)
        self.assertEqual(q("?kind=seller")["count"], 2)
        self.assertEqual(q("?rating=2")["count"], 2)
        self.assertEqual(q(f"?seller={self.maker.public_id}")["count"], 2)
        self.assertEqual(q(f"?reviewer={self.buyer.public_id}")["count"], 4)
        self.assertEqual(q("?q=Really")["count"], 2)
        self.assertEqual(q("?status=Hidden")["count"], 0)
        self.assertEqual(q("?page_size=2")["total_pages"], 2)
        rid = q("")["results"][0]["id"]
        self.assertEqual(self.post(f"/api/reviews/admin/{rid}/hide/", {"reason": "bad"}, as_=self.viewer).status_code, 403)
        self.assertEqual(self.post(f"/api/reviews/admin/{rid}/hide/", {"reason": "no"}, as_=self.mod).status_code, 400)
        self.assertEqual(self.post(f"/api/reviews/admin/{rid}/hide/", {"reason": "Breaks the rules"}, as_=self.mod).status_code, 200)
        self.assertEqual(q("?status=Hidden")["count"], 1)
        self.assertEqual(self.post(f"/api/reviews/admin/{rid}/restore/", {}, as_=self.mod).status_code, 200)
        self.assertEqual(q("?status=Hidden")["count"], 0)
