"""Follow flow end to end: public counts, 'who I follow', the feed, and a ReMaker's followers."""

from apps.core.models import Category
from apps.core.testing import APIBase
from apps.orders.models import Order
from apps.payments.models import Payment
from apps.remakers.models import RemakerProduct, ReMakers

from .models import Follow, WishlistEntry

FOLLOW = "/api/social/follow/"
FOLLOWERS = "/api/social/followers/"


class FollowPeopleBase(APIBase):
    def setUp(self):
        super().setUp()
        self.cat = Category.objects.create(name="Furniture", slug="furniture", applies_to="Both")
        self.maker = self.make_remaker("maker@example.com", "Maker One")
        self.other_maker = self.make_remaker("two@example.com", "Maker Two")
        self.ann = self.make_user("ann@example.com")
        self.ben = self.make_user("ben@example.com")
        self.ann.full_name, self.ben.full_name = "Ann Rao", "Ben Shah"
        self.ann.save(), self.ben.save()
        self.ann.profile.city, self.ann.profile.state = "Surat", "Gujarat"
        self.ann.profile.save()

    def product(self, maker=None, title="Teak lamp", status="Listed"):
        return RemakerProduct.objects.create(
            remaker=maker or self.maker, category=self.cat, title=title,
            description="A hand finished reclaimed wood lamp.", price=2500, stock=2, status=status)

    def follow(self, who, maker=None):
        return self.post(FOLLOW, {"id": (maker or self.maker).public_id}, as_=who)

    def order(self, buyer, status="Delivered", subtotal=1000, maker=None):
        pay = Payment.objects.create(buyer_type="user", buyer_key=f"user:{buyer.pk}", buyer_user=buyer,
                                     method="COD", amount=subtotal, status="Paid")
        return Order.objects.create(
            buyer_type="user", buyer_key=f"user:{buyer.pk}", buyer_user=buyer, payment=pay,
            seller_type="remaker", seller_remaker=maker or self.maker, status=status,
            subtotal=subtotal, total=subtotal, address={})


class PublicCountTests(FollowPeopleBase):
    def public(self, maker):
        return self.client.get(f"/api/remakers/public/{maker.public_id}/").data["data"]["remaker"]

    def test_follower_and_product_counts_are_real(self):
        self.product(); self.product(title="Second lamp"); self.product(title="Draft", status="Draft")
        self.follow(self.ann); self.follow(self.ben)
        r = self.public(self.maker)
        self.assertEqual((r["followers_count"], r["products_count"]), (2, 2))
        self.assertEqual(self.public(self.other_maker)["followers_count"], 0)

    def test_directory_list_has_counts_and_unfollow_lowers_them(self):
        self.follow(self.ann)
        rows = self.client.get("/api/remakers/public/").data["data"]["results"]
        by = {r["public_id"]: r for r in rows}
        self.assertEqual(by[self.maker.public_id]["followers_count"], 1)
        self.delete(f"{FOLLOW}{self.maker.public_id}/", as_=self.ann)
        rows = self.client.get("/api/remakers/public/").data["data"]["results"]
        self.assertEqual({r["public_id"]: r for r in rows}[self.maker.public_id]["followers_count"], 0)

    def test_admin_followers_do_not_count(self):
        admin = self.make_admin("a@example.com")
        self.assertEqual(self.post(FOLLOW, {"id": self.maker.public_id}, as_=admin).status_code, 201)
        self.assertEqual(self.public(self.maker)["followers_count"], 0)


class FollowingListTests(FollowPeopleBase):
    def test_list_carries_public_card_data_newest_first(self):
        self.follow(self.ann, self.maker); self.follow(self.ann, self.other_maker)
        rows = self.get(FOLLOW, as_=self.ann).data["data"]["following"]
        self.assertEqual([r["id"] for r in rows], [self.other_maker.public_id, self.maker.public_id])
        self.assertEqual(rows[0]["remaker"]["public_id"], self.other_maker.public_id)
        self.assertIn("followers_count", rows[0]["remaker"])
        self.assertNotIn("email", str(rows))

    def test_only_my_follows_and_inactive_makers_hidden(self):
        self.follow(self.ann); self.follow(self.ben, self.other_maker)
        self.assertEqual(len(self.get(FOLLOW, as_=self.ann).data["data"]["following"]), 1)
        ReMakers.objects.filter(pk=self.maker.pk).update(status="Blocked")
        self.assertEqual(self.get(FOLLOW, as_=self.ann).data["data"]["following"], [])

    def test_requires_login(self):
        self.assertEqual(self.client.get(FOLLOW).status_code, 401)


class FeedTests(FollowPeopleBase):
    def test_feed_has_only_live_products_of_followed_makers_newest_first(self):
        a = self.product(title="First lamp"); b = self.product(title="Second lamp")
        self.product(title="Hidden draft", status="Draft")
        self.product(self.other_maker, "Not followed")
        self.follow(self.ann)
        items = self.get(f"{FOLLOW}feed/", as_=self.ann).data["data"]["items"]
        self.assertEqual([i["id"] for i in items], [b.public_id, a.public_id])
        self.assertEqual(items[0]["seller"]["id"], self.maker.public_id)

    def test_feed_empty_without_follows_and_after_unfollow(self):
        self.product()
        self.assertEqual(self.get(f"{FOLLOW}feed/", as_=self.ann).data["data"]["items"], [])
        self.follow(self.ann)
        self.assertEqual(len(self.get(f"{FOLLOW}feed/", as_=self.ann).data["data"]["items"]), 1)
        self.delete(f"{FOLLOW}{self.maker.public_id}/", as_=self.ann)
        self.assertEqual(self.get(f"{FOLLOW}feed/", as_=self.ann).data["data"]["items"], [])

    def test_feed_route_is_not_mistaken_for_a_maker_id(self):
        self.assertEqual(self.get(f"{FOLLOW}feed/", as_=self.ann).status_code, 200)


class FollowersListTests(FollowPeopleBase):
    def followers(self, who=None):
        return self.get(FOLLOWERS, as_=who or self.maker)

    def test_lists_real_people_newest_first_with_profile_facts(self):
        self.follow(self.ben); self.follow(self.ann)
        r = self.followers()
        self.assertEqual(r.status_code, 200, r.data)
        rows = r.data["data"]["followers"]
        self.assertEqual([p["name"] for p in rows], ["Ann Rao", "Ben Shah"])
        ann = rows[0]
        self.assertEqual((ann["type"], ann["city"], ann["state"]), ("User", "Surat", "Gujarat"))
        self.assertEqual(ann["id"], self.ann.public_id)
        self.assertTrue(ann["followedAt"] and ann["joined"])
        self.assertNotIn("email", str(rows))

    def test_remaker_followers_are_marked_as_remakers(self):
        self.follow(self.other_maker)
        row = self.followers().data["data"]["followers"][0]
        self.assertEqual((row["type"], row["name"], row["customerId"]), ("ReMaker", "Test Maker", ""))

    def test_customer_only_after_a_real_order_with_this_maker(self):
        self.follow(self.ann); self.follow(self.ben)
        self.order(self.ann, "Delivered", 1200); self.order(self.ann, "Delivered", 300)
        self.order(self.ben, "Cancelled", 900)                       # cancelled: not a customer
        self.order(self.ben, "Delivered", 500, maker=self.other_maker)  # someone else's customer
        rows = {p["name"]: p for p in self.followers().data["data"]["followers"]}
        self.assertEqual(rows["Ann Rao"]["customerId"], self.ann.public_id)
        self.assertEqual((rows["Ann Rao"]["orders"], rows["Ann Rao"]["spent"]), (2, 1500))
        self.assertEqual((rows["Ben Shah"]["customerId"], rows["Ben Shah"]["orders"]), ("", 0))

    def test_unpaid_order_does_not_make_a_customer_and_confirmed_does_without_spend(self):
        self.follow(self.ann)
        self.order(self.ann, "Pending_Payment")
        self.assertEqual(self.followers().data["data"]["followers"][0]["customerId"], "")
        self.order(self.ann, "Confirmed", 700)
        row = self.followers().data["data"]["followers"][0]
        self.assertEqual((row["customerId"], row["orders"], row["spent"]), (self.ann.public_id, 1, 0))

    def test_saves_count_only_my_products(self):
        mine, other = self.product(), self.product(self.other_maker, "Elsewhere")
        self.follow(self.ann)
        for ref in (mine.public_id, other.public_id):
            WishlistEntry.objects.create(actor_type="user", user=self.ann, item_kind="remaker", item_ref=ref)
        self.assertEqual(self.followers().data["data"]["followers"][0]["saves"], 1)

    def test_only_my_followers_and_users_cannot_read(self):
        self.follow(self.ann); self.follow(self.ben, self.other_maker)
        self.assertEqual(self.followers().data["data"]["count"], 1)
        self.assertEqual(self.followers(self.ann).status_code, 403)
        self.assertEqual(self.client.get(FOLLOWERS).status_code, 401)

    def test_remove_follower_then_they_can_follow_again(self):
        self.follow(self.ann)
        self.assertEqual(self.delete(f"{FOLLOWERS}{self.ann.public_id}/", as_=self.maker).status_code, 200)
        self.assertEqual(Follow.objects.count(), 0)
        self.assertEqual(self.followers().data["data"]["followers"], [])
        self.assertEqual(self.follow(self.ann).status_code, 201)
        self.assertEqual(self.delete(f"{FOLLOWERS}{self.ann.public_id}/", as_=self.ann).status_code, 403)

    def test_follower_photo_is_a_full_url(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        import io
        from PIL import Image
        buf = io.BytesIO(); Image.new("RGB", (20, 20), "red").save(buf, "PNG")
        self.ann.profile.profile_image.save("a.png", SimpleUploadedFile("a.png", buf.getvalue(), "image/png"))
        self.follow(self.ann)
        row = self.followers().data["data"]["followers"][0]
        self.assertTrue(row["image"].startswith("http"), row["image"])
