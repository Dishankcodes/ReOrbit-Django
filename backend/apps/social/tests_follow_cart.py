from apps.core.models import Category
from apps.core.testing import APIBase
from apps.listings.models import Item
from apps.remakers.models import RemakerProduct
from .models import Cart, Follow


class FollowAndCartTests(APIBase):
    def setUp(self):
        super().setUp()
        category = Category.objects.create(name="Furniture", slug="furniture", applies_to="Both")
        self.user = self.make_user("follower@example.com")
        self.seller = self.make_user("seller@example.com")
        self.maker = self.make_remaker()
        self.item = Item.objects.create(user=self.seller, category=category, title="Wooden stool",
            description="A sturdy reclaimed wood stool.", condition="Good", quantity=3,
            listing_price=1000, pickup_preference="Platform_Pickup", item_status="Listed",
            city="Surat", pincode="395003")
        self.product = RemakerProduct.objects.create(remaker=self.maker, category=category,
            title="Reclaimed lamp", description="A hand finished reclaimed wood lamp.",
            price=2500, stock=2, status="Listed")

    def test_follow_is_persistent_idempotent_and_self_follow_is_blocked(self):
        url = "/api/social/follow/"
        self.assertEqual(self.post(url, {"id": self.maker.public_id}, as_=self.user).status_code, 201)
        self.assertEqual(self.post(url, {"id": self.maker.public_id}, as_=self.user).status_code, 201)
        self.assertEqual(Follow.objects.count(), 1)
        self.assertEqual(self.get(url, as_=self.user).data["data"]["following"][0]["id"], self.maker.public_id)
        self.assertEqual(self.get("/api/social/followers/", as_=self.maker).data["data"]["count"], 1)
        self.assertEqual(self.post(url, {"id": self.maker.public_id}, as_=self.maker).status_code, 400)
        self.delete(f"/api/social/follow/{self.maker.public_id}/", self.user)
        self.assertEqual(Follow.objects.count(), 0)

    def test_cart_stores_ids_and_quantities_and_rejects_oversell(self):
        url = "/api/social/cart/"
        r = self.client.put(url, {"items": [{"id": self.item.public_id, "qty": 2},
                                               {"id": self.product.public_id, "qty": 1}]},
                            format="json", **self._headers(self.user))
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(Cart.objects.count(), 1)
        self.assertEqual(self.get(url, as_=self.user).data["data"]["count"], 2)
        bad = self.client.put(url, {"items": [{"id": self.item.public_id, "qty": 4}]},
                              format="json", **self._headers(self.user))
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(self.get(url, as_=self.user).data["data"]["items"][0]["qty"], 2)
