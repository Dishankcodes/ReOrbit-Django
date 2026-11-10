from apps.core.models import AuditLog, Category
from apps.core.testing import APIBase
from apps.remakers.models import RemakerProduct

URL = "/api/core/admin/categories/"


class CategoryAdminTests(APIBase):
    def setUp(self):
        super().setUp()
        self.boss = self.make_admin("boss@example.com", modules={"content": "edit"})
        self.viewer = self.make_admin("view@example.com", modules={"content": "view"})
        self.nobody = self.make_admin("none@example.com", modules={"orders": "edit"})
        Category.objects.create(name="Other", slug="other", sort_order=1)

    def add(self, name, **kw):
        return self.post(URL, {"name": name, "icon": "Lamp", "blurb": "x", **kw}, as_=self.boss)

    def names(self):
        return [c["name"] for c in self.get(URL, as_=self.boss).data["data"]["results"]]

    def test_permissions(self):
        self.assertEqual(self.get(URL, as_=self.viewer).status_code, 200)
        self.assertEqual(self.get(URL, as_=self.nobody).status_code, 403)
        self.assertEqual(self.add("Lamps").status_code, 201)
        self.assertEqual(self.post(URL, {"name": "Nope"}, as_=self.viewer).status_code, 403)
        self.assertEqual(self.get(URL, as_=self.make_user()).status_code, 403)
        self.assertEqual(self.client.get(URL).status_code, 401)

    def test_create_validation_and_order(self):
        self.assertEqual(self.add("A").status_code, 400)
        self.assertEqual(self.add("Lamps", icon="Nope").status_code, 400)
        self.assertEqual(self.add("Lamps", blurb="x" * 91).status_code, 400)
        self.assertEqual(self.add("Lamps").status_code, 201)
        self.assertEqual(self.add("lamps").status_code, 400)  # same name ignoring capitals
        self.add("Books")
        self.assertEqual(self.names(), ["Lamps", "Books", "Other"])  # Other stays last
        self.assertTrue(AuditLog.objects.filter(action="category.create").exists())

    def test_public_list_shows_only_visible_in_order(self):
        self.add("Lamps")
        c = self.add("Books").data["data"]["category"]["id"]
        self.patch(f"{URL}{c}/", {"active": False}, as_=self.boss)
        pub = [x["name"] for x in self.client.get("/api/core/categories/").data["data"]]
        self.assertEqual(pub, ["Lamps", "Other"])

    def test_rename_hide_and_in_use_rules(self):
        cid = self.add("Lamps").data["data"]["category"]["id"]
        r = self.patch(f"{URL}{cid}/", {"name": "Lights", "blurb": "Bulbs"}, as_=self.boss)
        self.assertEqual((r.data["data"]["category"]["name"], r.data["data"]["category"]["blurb"]), ("Lights", "Bulbs"))
        cat = Category.objects.get(public_id=cid)
        RemakerProduct.objects.create(remaker=self.make_remaker(), category=cat, title="Lamp", description="d" * 10, price=100, stock=1, status="Listed")
        r = self.patch(f"{URL}{cid}/", {"name": "Lamps again"}, as_=self.boss)
        self.assertEqual(r.status_code, 400)
        self.assertIn("name", r.data["errors"])
        self.assertEqual(self.patch(f"{URL}{cid}/", {"active": False}, as_=self.boss).status_code, 200)  # hiding is fine
        row = next(c for c in self.get(URL, as_=self.boss).data["data"]["results"] if c["id"] == cid)
        self.assertEqual((row["inUse"], row["usage"]["products"], row["active"]), (True, 1, False))
        d = self.delete(f"{URL}{cid}/", as_=self.boss)
        self.assertEqual((d.status_code, d.data["code"]), (409, "IN_USE"))

    def test_delete_and_locked_other(self):
        cid = self.add("Lamps").data["data"]["category"]["id"]
        self.assertEqual(self.delete(f"{URL}{cid}/", as_=self.boss).status_code, 200)
        self.assertEqual(self.names(), ["Other"])
        other = Category.objects.get(slug="other").public_id
        self.assertEqual(self.delete(f"{URL}{other}/", as_=self.boss).status_code, 409)
        self.assertEqual(self.patch(f"{URL}{other}/", {"active": False}, as_=self.boss).status_code, 409)
        self.assertEqual(self.patch(f"{URL}{other}/", {"name": "Misc"}, as_=self.boss).status_code, 400)

    def test_move(self):
        a = self.add("A1").data["data"]["category"]["id"]
        b = self.add("B1").data["data"]["category"]["id"]
        self.post(f"{URL}{b}/move/", {"dir": -1}, as_=self.boss)
        self.assertEqual(self.names(), ["B1", "A1", "Other"])
        self.post(f"{URL}{a}/move/", {"dir": 1}, as_=self.boss)  # cannot pass Other
        self.assertEqual(self.names(), ["B1", "A1", "Other"])
        self.assertEqual(self.post(f"{URL}{a}/move/", {"dir": 5}, as_=self.boss).status_code, 400)
