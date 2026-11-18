from apps.core.testing import APIBase


class AddressBookIsTheOnePlaceTests(APIBase):
    def addr(self, **over):
        body = {"name": "Asha Shah", "phone": "9876543210", "line1": "12 Lake Road, Navrangpura",
                "city": "Ahmedabad", "state": "Gujarat", "pincode": "380009"}
        body.update(over)
        return body

    def test_default_address_fills_the_profile_and_follows_changes(self):
        u = self.make_user()
        r = self.post("/api/orders/addresses/", self.addr(), as_=u)
        self.assertEqual(r.status_code, 201, r.data)
        u.profile.refresh_from_db()
        self.assertEqual((u.profile.city, u.profile.pincode), ("Ahmedabad", "380009"))
        self.assertIn("9876543210", (u.profile.phone or "").replace(" ", ""))

        # a second address made default moves the profile with it
        r2 = self.post("/api/orders/addresses/", self.addr(city="Surat", pincode="395007", is_default=True), as_=u)
        self.assertEqual(r2.status_code, 201, r2.data)
        u.profile.refresh_from_db()
        self.assertEqual((u.profile.city, u.profile.pincode), ("Surat", "395007"))

        # deleting it falls back to the remaining one
        pid = r2.data["data"]["address"]["id"]
        self.assertEqual(self.delete(f"/api/orders/addresses/{pid}/", as_=u).status_code, 200)
        u.profile.refresh_from_db()
        self.assertEqual(u.profile.city, "Ahmedabad")

    def test_remaker_profile_follows_the_address_book_too(self):
        m = self.make_remaker()
        self.post("/api/orders/addresses/", self.addr(city="Vadodara", pincode="390001"), as_=m)
        m.profile.refresh_from_db()
        self.assertEqual((m.profile.city, m.profile.pincode), ("Vadodara", "390001"))
