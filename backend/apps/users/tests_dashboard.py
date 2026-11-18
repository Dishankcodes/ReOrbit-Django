from apps.core.testing import APIBase


class MemberDashboardTests(APIBase):
    def test_every_section_loads(self):
        u = self.make_user()
        for name in ("summary", "orders", "selling", "donations", "activity", "picks"):
            r = self.get(f"/api/users/me/dashboard/?section={name}", as_=u)
            self.assertEqual(r.status_code, 200, (name, r.data))
        d = self.get("/api/users/me/dashboard/", as_=u).data["data"]
        self.assertEqual(d["orders"]["total"], 0)
        self.assertEqual(d["points"]["level"], "Seedling")
        self.assertEqual(self.get("/api/users/me/dashboard/?section=nope", as_=u).status_code, 400)
        self.assertEqual(self.get("/api/users/me/dashboard/", as_=self.make_remaker()).status_code, 403)
