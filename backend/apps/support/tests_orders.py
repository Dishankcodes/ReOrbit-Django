"""A ticket that points at an order: the order is checked, summarised, and the ticket can be assigned."""

from apps.orders.tests import OrderBase

from .models import SupportTicket


class TicketOrderTests(OrderBase):
    def setUp(self):
        super().setUp()
        self.agent = self.make_admin("agent@example.com", modules={"support": "edit"})
        self.other_agent = self.make_admin("agent2@example.com", modules={"support": "edit"})
        r = self.checkout([{"id": self.lamp.public_id, "qty": 1}, {"id": self.table.public_id, "qty": 1}])
        self.assertEqual(r.status_code, 201, r.data)
        self.orders = {o["seller"]["type"]: o["id"] for o in r.data["data"]["orders"]}

    def open_ticket(self, who, order_id, **extra):
        r = self.post("/api/support/me/", {"subject": "Item is damaged", "message": "Please help me return it.",
                                           "orderId": order_id, **extra}, as_=who)
        return r

    def test_ticket_shows_its_order_to_the_member_and_to_the_team(self):
        oid = self.orders["user"]
        r = self.open_ticket(self.buyer, oid)
        self.assertEqual(r.status_code, 201, r.data)
        order = r.data["data"]["ticket"]["order"]
        self.assertEqual(order["id"], oid)
        self.assertEqual(order["role"], "buyer")
        self.assertEqual(order["seller"]["type"], "user")
        self.assertEqual(order["items"][0]["title"], self.lamp.title)
        self.assertEqual(order["total"], 1000 + 30 + 149)
        tid = r.data["data"]["ticket"]["id"]
        seen = self.get(f"/api/support/admin/{tid}/", as_=self.agent).data["data"]["ticket"]["order"]
        self.assertEqual(seen["role"], "")
        self.assertEqual(seen["buyer"]["name"], self.buyer.full_name)
        # the list stays light: only the id, no summary
        row = self.get("/api/support/me/", as_=self.buyer).data["data"]["tickets"][0]
        self.assertEqual(row["orderId"], oid)
        self.assertNotIn("order", row)

    def test_the_seller_of_a_member_order_can_raise_a_ticket_but_a_stranger_cannot(self):
        oid = self.orders["user"]
        self.assertEqual(self.open_ticket(self.seller, oid).status_code, 201)
        stranger = self.make_user("stranger@example.com")
        self.assertEqual(self.open_ticket(stranger, oid).status_code, 404)
        self.assertEqual(self.open_ticket(self.buyer, "ORD-NOPE").status_code, 404)

    def test_first_reply_assigns_the_ticket_and_the_inbox_can_filter_by_assignee(self):
        tid = self.open_ticket(self.buyer, self.orders["user"]).data["data"]["ticket"]["id"]
        mine = f"/api/support/admin/?assigned=me"
        self.assertEqual(self.get(mine, as_=self.agent).data["data"]["total"], 0)
        self.assertEqual(self.get("/api/support/admin/?assigned=none", as_=self.agent).data["data"]["total"], 1)
        self.post(f"/api/support/admin/{tid}/", {"action": "reply", "message": "Looking into it."}, as_=self.agent)
        self.assertEqual(SupportTicket.objects.get(public_id=tid).assigned_to, self.agent)
        self.assertEqual(self.get(mine, as_=self.agent).data["data"]["total"], 1)
        self.assertEqual(self.get(mine, as_=self.other_agent).data["data"]["total"], 0)
        # a second agent answering does not steal it
        self.post(f"/api/support/admin/{tid}/", {"action": "reply", "message": "Also here."}, as_=self.other_agent)
        self.assertEqual(SupportTicket.objects.get(public_id=tid).assigned_to, self.agent)
        # but assigning on purpose does
        r = self.post(f"/api/support/admin/{tid}/", {"action": "assign", "assignee_id": self.other_agent.public_id}, as_=self.agent)
        self.assertEqual(r.data["data"]["ticket"]["assignedTo"]["id"], self.other_agent.public_id)

    def test_one_open_ticket_per_order_until_it_is_resolved(self):
        oid = self.orders["user"]
        first = self.open_ticket(self.buyer, oid)
        self.assertEqual(first.status_code, 201, first.data)
        tid = first.data["data"]["ticket"]["id"]
        again = self.open_ticket(self.buyer, oid)
        self.assertEqual(again.status_code, 409, again.data)
        self.assertEqual(again.data["code"], "ticket_exists")
        self.assertEqual(again.data["errors"]["ticket_id"], tid)
        # another order is fine, and so is the same one once the first ticket is resolved
        other = self.open_ticket(self.buyer, self.orders["remaker"])
        self.assertEqual(other.status_code, 201, other.data)
        self.post(f"/api/support/admin/{tid}/", {"action": "resolve"}, as_=self.agent)
        self.assertEqual(self.open_ticket(self.buyer, oid).status_code, 201)

