"""Product and seller reviews after a delivery."""

import shutil
import tempfile
from datetime import timedelta

from django.test import override_settings
from django.utils import timezone

from apps.core.tests.test_profile import image_file
from apps.orders.tests_post_delivery import PostDeliveryBase

from .models import ProductReview, SellerReview

TMP = tempfile.mkdtemp(prefix="reorbit_test_reviews_")


@override_settings(MEDIA_ROOT=TMP)
class ReviewTests(PostDeliveryBase):
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
        self.assertEqual(self.post(f"/api/reviews/received/{rid}/reply/", {"reply": "Thanks!"}, as_=self.buyer).status_code, 404)
        self.assertEqual(self.post(f"/api/reviews/received/{rid}/reply/", {"reply": " "}, as_=self.seller).status_code, 400)
        ok = self.post(f"/api/reviews/received/{rid}/reply/", {"reply": "Thanks!"}, as_=self.seller)
        self.assertEqual(ok.status_code, 200, ok.data)
        row = self.get("/api/reviews/me/", as_=self.buyer).data["data"]["results"][0]
        self.assertEqual(row["seller_review"]["reply"], "Thanks!")
