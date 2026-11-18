from apps.core.models import Category
from apps.core.testing import APIBase
from apps.remakers.models import RemakerProduct


class SellerFilterTests(APIBase):
    def test_marketplace_can_show_one_sellers_live_products(self):
        cat = Category.objects.create(name="Lamps", slug="lamps")
        m = self.make_remaker()
        other = self.make_remaker(email="other@example.com", username="Other One")
        mine = RemakerProduct.objects.create(remaker=m, category=cat, title="Bottle lamp", price=900, stock=1, status="Listed")
        RemakerProduct.objects.create(remaker=other, category=cat, title="Tin lamp", price=500, stock=1, status="Listed")
        RemakerProduct.objects.create(remaker=m, category=cat, title="Draft lamp", price=500, stock=1, status="Draft")
        r = self.get(f"/api/marketplace/?seller={m.public_id}")
        self.assertEqual([c["id"] for c in r.data["data"]["results"]], [mine.public_id])
        self.assertEqual(self.get("/api/marketplace/?seller=USR-9999").data["data"]["count"], 0)
        self.assertEqual(self.get("/api/marketplace/").data["data"]["count"], 2)
