from datetime import timedelta

from django.utils import timezone

from apps.core.testing import APIBase

from .models import Banner, Policy

BANNER = {"title": "Festive sale", "subtitle": "Up to 40% off", "cta": "Shop now", "link": "/user-shop",
          "placement": "Home hero", "audience": "Everyone", "image": "https://example.com/a.jpg"}


class ContentTests(APIBase):
    def setUp(self):
        super().setUp()
        self.admin = self.make_admin(modules={"content": "edit"})

    def test_starts_without_demo_banners_or_faqs_but_with_policies(self):
        self.assertEqual(self.get("/api/content/admin/banners/", as_=self.admin).data["data"]["results"], [])
        self.assertEqual(self.get("/api/content/admin/faqs/", as_=self.admin).data["data"]["results"], [])
        rows = self.get("/api/content/admin/policies/", as_=self.admin).data["data"]["results"]
        self.assertIn("terms", [r["key"] for r in rows])

    def test_needs_content_module(self):
        other = self.make_admin(email="o@example.com", modules={"products": "edit"})
        self.assertEqual(self.get("/api/content/admin/banners/", as_=other).status_code, 403)
        self.assertEqual(self.get("/api/content/admin/banners/", as_=self.make_user()).status_code, 403)

    def test_banner_lifecycle_and_public_visibility(self):
        r = self.post("/api/content/admin/banners/", BANNER, as_=self.admin)
        self.assertEqual(r.status_code, 201)
        b = r.data["data"]["banner"]
        self.assertEqual(b["status"], "Draft")
        self.assertEqual(self.get("/api/content/banners/").data["data"]["results"], [])
        self.patch(f"/api/content/admin/banners/{b['id']}/", {"active": True}, as_=self.admin)
        live = self.get("/api/content/banners/?placement=Home hero").data["data"]["results"]
        self.assertEqual(len(live), 1)
        self.post(f"/api/content/banners/{b['id']}/view/")
        self.post(f"/api/content/banners/{b['id']}/click/")
        row = self.get("/api/content/admin/banners/", as_=self.admin).data["data"]["results"][0]
        self.assertEqual((row["views"], row["clicks"]), (1, 1))
        tomorrow = (timezone.localdate() + timedelta(days=1)).isoformat()
        self.patch(f"/api/content/admin/banners/{b['id']}/", {"start": tomorrow}, as_=self.admin)
        self.assertEqual(self.get("/api/content/banners/").data["data"]["results"], [])
        self.delete(f"/api/content/admin/banners/{b['id']}/", as_=self.admin)
        self.assertEqual(Banner.objects.count(), 0)

    def test_banner_validation(self):
        bad = {**BANNER, "title": "ab", "link": "javascript:x", "end": "2020-01-01", "start": "2021-01-01"}
        r = self.post("/api/content/admin/banners/", bad, as_=self.admin)
        self.assertEqual(r.status_code, 400)

    def test_audience_filter(self):
        b = self.post("/api/content/admin/banners/", {**BANNER, "audience": "Visitors only"}, as_=self.admin).data["data"]["banner"]
        self.patch(f"/api/content/admin/banners/{b['id']}/", {"active": True}, as_=self.admin)
        self.assertEqual(len(self.get("/api/content/banners/?audience=visitor").data["data"]["results"]), 1)
        self.assertEqual(self.get("/api/content/banners/?audience=member").data["data"]["results"], [])

    def test_faq_flow(self):
        r = self.post("/api/content/admin/faqs/", {"topic": "Buying", "q": "How do I pay for an order?",
                                                    "a": "Pay online at checkout with UPI or a card."}, as_=self.admin)
        self.assertEqual(r.status_code, 201)
        fid = r.data["data"]["faq"]["id"]
        self.assertEqual(len(self.get("/api/content/faqs/").data["data"]["results"]), 1)
        self.patch(f"/api/content/admin/faqs/{fid}/", {"published": False}, as_=self.admin)
        self.assertEqual(self.get("/api/content/faqs/").data["data"]["results"], [])

    def test_policy_publish_restore(self):
        rows = {r["key"]: r for r in self.get("/api/content/admin/policies/", as_=self.admin).data["data"]["results"]}
        self.assertTrue(rows["community"]["neverPublished"])
        self.assertEqual(self.get("/api/content/policies/community/").status_code, 404)
        body = "x" * 40
        r = self.post("/api/content/admin/policies/community/publish/", {"body": body}, as_=self.admin)
        self.assertEqual(r.data["data"]["version"], "1.0")
        r = self.post("/api/content/admin/policies/community/publish/", {"body": body + "y"}, as_=self.admin)
        self.assertEqual(r.status_code, 400)  # note required after the first publish
        r = self.post("/api/content/admin/policies/community/publish/", {"body": body + "y", "note": "Fixed typo"}, as_=self.admin)
        self.assertEqual(r.data["data"]["version"], "1.1")
        r = self.post("/api/content/admin/policies/community/publish/", {"body": body + "z", "note": "Big change", "major": True}, as_=self.admin)
        self.assertEqual(r.data["data"]["version"], "2.0")
        r = self.post("/api/content/admin/policies/community/restore/", {"version": "1.0"}, as_=self.admin)
        self.assertEqual(r.data["data"]["version"], "2.1")
        self.assertEqual(Policy.objects.get(key="community").body, body)
        self.assertEqual(self.get("/api/content/policies/community/").data["data"]["policy"]["version"], "2.1")

    def test_policy_draft(self):
        self.post("/api/content/admin/policies/terms/draft/", {"body": "d" * 30, "note": "wip"}, as_=self.admin)
        p = Policy.objects.get(key="terms")
        self.assertTrue(p.has_draft)
        self.assertNotEqual(p.body, "d" * 30)  # the public text is untouched
        self.delete("/api/content/admin/policies/terms/draft/", as_=self.admin)
        self.assertFalse(Policy.objects.get(key="terms").has_draft)
