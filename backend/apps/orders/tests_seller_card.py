"""The "Sold by" card on an order page shows the real seller, and ReOrbit's own details for ReOrbit's store."""

from django.test import override_settings

from .tests import GOOD_ADDR, OrderBase


class SellerCardTests(OrderBase):
    def detail(self, who, oid):
        r = self.get(f"/api/orders/me/{oid}/", as_=who)
        self.assertEqual(r.status_code, 200, r.data)
        return r.data["data"]["order"]

    def order_ids(self, who, addr, items):
        r = self.client.post("/api/orders/checkout/", {"items": items, "address_id": addr, "method": "COD"},
                             format="json", **self._headers(who))
        self.assertEqual(r.status_code, 201, r.data)
        return {o["seller"]["type"]: o["id"] for o in r.data["data"]["orders"]}

    def test_a_remaker_buying_from_reorbit_sees_reorbits_address(self):
        r = self.post("/api/orders/addresses/", GOOD_ADDR, as_=self.maker)
        self.assertEqual(r.status_code, 201, r.data)
        ids = self.order_ids(self.maker, r.data["data"]["address"]["id"],
                             [{"id": self.tote.public_id, "qty": 1}, {"id": self.lamp.public_id, "qty": 1}])
        card = self.detail(self.maker, ids["platform"])["seller"]
        self.assertEqual(card["type"], "platform")
        self.assertEqual(card["name"], "ReOrbit")
        # nothing saved in Admin › Addresses yet: left empty, never made up
        self.assertEqual((card["address"]["city"], card["address"]["line1"], card["phone"]), ("", "", ""))
        self.assertTrue(card["email"])
        # ReOrbit's address book is the source
        self.assertEqual(self.post("/api/orders/addresses/", GOOD_ADDR, as_=self.boss).status_code, 201)
        card = self.detail(self.maker, ids["platform"])["seller"]
        self.assertEqual(card["address"]["city"], GOOD_ADDR["city"])
        self.assertTrue(card["address"]["line1"])

    @override_settings(REORBIT_STORE={"name": "ReOrbit", "address_line": "1 Test Road", "city": "Surat",
                                      "state": "Gujarat", "pincode": "395003", "phone": "99999"})
    def test_the_address_comes_from_settings(self):
        ids = self.order_ids(self.buyer, self.addr, [{"id": self.tote.public_id, "qty": 1}])
        card = self.detail(self.buyer, ids["platform"])["seller"]
        self.assertEqual((card["address"]["line1"], card["address"]["pincode"], card["phone"]),
                         ("1 Test Road", "395003", "99999"))

    def test_a_member_seller_has_real_numbers_and_no_invented_ones(self):
        ids = self.order_ids(self.buyer, self.addr, [{"id": self.lamp.public_id, "qty": 1}])
        card = self.detail(self.buyer, ids["user"])["seller"]
        self.assertEqual(card["type"], "user")
        self.assertEqual(card["name"], self.seller.full_name)
        self.assertEqual(card["rating"], 0)
        self.assertEqual(card["totalReviews"], 0)
        self.assertNotIn("address", card)  # a member's address is never shown to the buyer

    def test_a_remaker_seller_card(self):
        ids = self.order_ids(self.buyer, self.addr, [{"id": self.table.public_id, "qty": 1}])
        card = self.detail(self.buyer, ids["remaker"])["seller"]
        self.assertEqual(card["type"], "remaker")
        self.assertEqual(card["username"], self.maker.username)
        self.assertNotIn("address", card)
