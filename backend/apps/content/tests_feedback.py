"""Testimonials (rate ReOrbit) and the Discover ReMakers picks."""

from apps.core.testing import APIBase
from apps.remakers.models import ReMaker_Profile

from .models import PlatformFeedback


class TestimonialTests(APIBase):
    def setUp(self):
        super().setUp()
        self.ed = self.make_admin("ed@example.com", modules={"content": "edit"})
        self.users = [self.make_user(f"u{i}@example.com") for i in range(4)]
        self.maker = self.make_remaker()

    def rate(self, who, stars=5, text="Lovely way to give things a second life."):
        return self.post("/api/content/feedback/", {"rating": stars, "message": text}, as_=who)

    def test_one_rating_per_account_and_editing_sends_it_back_to_review(self):
        self.assertEqual(self.rate(self.users[0]).status_code, 200)
        self.assertEqual(self.rate(self.users[0], 4).status_code, 200)
        self.assertEqual(PlatformFeedback.objects.count(), 1)
        self.assertEqual(self.rate(self.users[0], 9).status_code, 400)
        self.assertEqual(self.rate(self.maker).status_code, 200)
        mine = self.get("/api/content/feedback/mine/", as_=self.maker).data["data"]["feedback"]
        self.assertEqual(mine["status"], "New")
        self.assertEqual(self.rate(self.ed).status_code, 403)

    def test_admin_shows_at_most_three_per_home_page(self):
        ids = []
        for u in self.users:
            self.rate(u)
            ids.append(PlatformFeedback.objects.get(user=u).public_id)
        for pid in ids[:3]:
            r = self.post(f"/api/content/admin/feedback/{pid}/", {"action": "show", "surface": "user"}, as_=self.ed)
            self.assertEqual(r.status_code, 200, r.data)
        r = self.post(f"/api/content/admin/feedback/{ids[3]}/", {"action": "show", "surface": "user"}, as_=self.ed)
        self.assertEqual(r.status_code, 409)
        pub = self.get("/api/public/testimonials/?side=user").data["data"]["testimonials"]
        self.assertEqual([t["id"] for t in pub], ids[:3])
        self.post(f"/api/content/admin/feedback/{ids[2]}/", {"action": "move", "direction": "up"}, as_=self.ed)
        pub = self.get("/api/public/testimonials/?side=user").data["data"]["testimonials"]
        self.assertEqual([t["id"] for t in pub], [ids[0], ids[2], ids[1]])
        self.rate(self.users[0], 3)  # an edit takes it down until it is checked again
        pub = self.get("/api/public/testimonials/?side=user").data["data"]["testimonials"]
        self.assertNotIn(ids[0], [t["id"] for t in pub])
        self.assertEqual(self.get("/api/public/testimonials/?side=remaker").data["data"]["testimonials"], [])


class DiscoverTests(APIBase):
    def setUp(self):
        super().setUp()
        self.ed = self.make_admin("ed@example.com", modules={"content": "edit"})
        self.a = self.make_remaker("a@example.com", "Maker A")
        self.b = self.make_remaker("b@example.com", "Maker B")
        ReMaker_Profile.objects.filter(remaker=self.b).update(rating_average=4.8, rating_count=10)

    def test_defaults_to_highest_rated_and_admin_can_pick(self):
        d = self.get("/api/public/discover-remakers/").data["data"]
        self.assertEqual(d["spotlight"]["id"], self.b.public_id)
        self.assertEqual([c["id"] for c in d["cards"]], [self.b.public_id, self.a.public_id])
        r = self.client.put("/api/content/admin/discover/", {"spotlight": self.a.public_id, "cards": [self.a.public_id]},
                            format="json", **self._headers(self.ed))
        self.assertEqual(r.status_code, 200, r.data)
        d = self.get("/api/public/discover-remakers/").data["data"]
        self.assertEqual(d["spotlight"]["id"], self.a.public_id)
        self.assertEqual(d["cards"][0]["id"], self.a.public_id)
        bad = self.client.put("/api/content/admin/discover/", {"cards": ["RMK-9999"]}, format="json",
                              **self._headers(self.ed))
        self.assertEqual(bad.status_code, 400)

    def test_a_save_reaches_every_server_worker(self):
        """On Render each worker has its own memory. A save must not leave the other worker showing
        the old picks: the version number lives in the shared database cache."""
        from django.core.cache import cache, caches

        self.get("/api/public/discover-remakers/")  # cached in this worker's memory
        before = caches["shared"].get("public_home_ver", 0)
        self.client.put("/api/content/admin/discover/", {"spotlight": self.a.public_id, "cards": [self.a.public_id]},
                        format="json", **self._headers(self.ed))
        self.assertNotEqual(caches["shared"].get("public_home_ver", 0), before)
        cache.delete("public_home_ver")  # what the other worker's memory looks like: never told about the save
        d = self.get("/api/public/discover-remakers/")
        self.assertEqual(d.data["data"]["spotlight"]["id"], self.a.public_id)
        self.assertIn("no-cache", d["Cache-Control"])  # browsers ask again instead of keeping it for a minute
