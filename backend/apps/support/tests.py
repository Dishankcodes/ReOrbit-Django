from apps.core.testing import APIBase
from apps.admins.models import Admins
from .models import SupportTicket, SupportTicketAdminRead, TicketMessage


class SupportTicketTests(APIBase):
    def setUp(self):
        super().setUp()
        self.user = self.make_user("help-user@example.com")
        self.other = self.make_user("other-user@example.com")
        self.maker = self.make_remaker()
        self.agent = self.make_admin("support@example.com", modules={"support": "edit"})

    def test_create_reply_assignment_resolution_reopen_and_owner_isolation(self):
        response = self.post("/api/support/me/", {
            "subject": "Order delivery update", "category": "Order or delivery",
            "message": "Please check my delivery status.",
        }, as_=self.user)
        self.assertEqual(response.status_code, 201, response.data)
        ticket_id = response.data["data"]["ticket"]["id"]
        self.assertEqual(TicketMessage.objects.count(), 1)
        self.assertEqual(self.get(f"/api/support/me/{ticket_id}/", as_=self.other).status_code, 404)
        self.assertEqual(self.post(f"/api/support/me/{ticket_id}/", {"message": "Any update?"}, as_=self.user).status_code, 201)
        self.assertEqual(self.post(f"/api/support/admin/{ticket_id}/", {"action": "assign"}, as_=self.agent).status_code, 200)
        resolved = self.post(f"/api/support/admin/{ticket_id}/", {"action": "resolve"}, as_=self.agent)
        self.assertEqual(resolved.data["data"]["ticket"]["status"], SupportTicket.Status.RESOLVED)
        reply = self.post(f"/api/support/me/{ticket_id}/", {"message": "Thanks"}, as_=self.user)
        self.assertEqual(reply.status_code, 201, reply.data)
        self.assertEqual(reply.data["data"]["ticket"]["status"], SupportTicket.Status.OPEN)
        self.assertEqual(len(reply.data["data"]["ticket"]["messages"]), 3)
        self.assertEqual(self.post(f"/api/support/me/{ticket_id}/", {"action": "close"}, as_=self.user).data["data"]["ticket"]["status"], SupportTicket.Status.RESOLVED)

    def test_admin_list_is_paged_filterable_and_summary_does_not_fetch_history(self):
        first = self.post("/api/support/me/", {
            "subject": "Payment issue", "category": "Payment or refund",
            "message": "Please check my refund.",
        }, as_=self.user)
        second = self.post("/api/support/me/", {
            "subject": "Product question", "category": "Other",
            "message": "I need help with this item.",
        }, as_=self.maker)
        first_id = first.data["data"]["ticket"]["id"]
        self.post(f"/api/support/admin/{first_id}/", {"action": "waiting"}, as_=self.agent)

        page = self.get("/api/support/admin/?requester=user&status=Waiting&limit=1", as_=self.agent)
        self.assertEqual(page.status_code, 200, page.data)
        self.assertEqual(page.data["data"]["total"], 1)
        row = page.data["data"]["tickets"][0]
        self.assertEqual(row["id"], first_id)
        self.assertEqual(row["messageCount"], 1)
        self.assertEqual(row["messages"], [])
        self.assertEqual(row["lastMessage"]["from"], "user")

        detail = self.get(f"/api/support/admin/{second.data['data']['ticket']['id']}/", as_=self.agent)
        self.assertEqual(detail.data["data"]["ticket"]["requester"]["type"], "remaker")
        self.assertEqual(len(detail.data["data"]["ticket"]["messages"]), 1)

    def test_support_module_permission_and_closed_ticket_rules(self):
        no_support = self.make_admin("no-support@example.com", modules={"messages": "edit"})
        created = self.post("/api/support/me/", {
            "subject": "Studio account", "message": "I need help with my studio.",
        }, as_=self.maker)
        ticket_id = created.data["data"]["ticket"]["id"]
        self.assertEqual(self.get("/api/support/admin/", as_=no_support).status_code, 403)
        self.assertEqual(self.get(f"/api/support/admin/{ticket_id}/", as_=no_support).status_code, 403)
        self.assertEqual(self.post(f"/api/support/admin/{ticket_id}/", {"action": "close"}, as_=no_support).status_code, 403)

        closed = self.post(f"/api/support/me/{ticket_id}/", {"action": "close", "status": "Closed"}, as_=self.maker)
        self.assertEqual(closed.data["data"]["ticket"]["status"], SupportTicket.Status.CLOSED)
        self.assertEqual(self.post(f"/api/support/me/{ticket_id}/", {"message": "One more thing"}, as_=self.maker).status_code, 409)

    def test_admin_waiting_reply_is_visible_to_remaker_and_can_be_reopened(self):
        created = self.post("/api/support/me/", {
            "subject": "Order question", "category": "Orders and shipping",
            "message": "Please check my order.",
        }, as_=self.maker)
        ticket_id = created.data["data"]["ticket"]["id"]
        reply = self.post(f"/api/support/admin/{ticket_id}/", {
            "action": "reply", "message": "Please send your order number.",
            "status": "Waiting for you",
        }, as_=self.agent)
        self.assertEqual(reply.status_code, 200, reply.data)
        self.assertEqual(reply.data["data"]["ticket"]["status"], SupportTicket.Status.WAITING)
        member = self.get(f"/api/support/me/{ticket_id}/", as_=self.maker)
        self.assertEqual(member.data["data"]["ticket"]["messages"][-1]["from"], "team")
        reopened = self.post(f"/api/support/admin/{ticket_id}/", {"action": "reopen"}, as_=self.agent)
        self.assertEqual(reopened.data["data"]["ticket"]["status"], SupportTicket.Status.OPEN)

    def test_only_ticket_owner_can_reference_an_order_and_attachment_is_https(self):
        invalid = self.post("/api/support/me/", {"subject": "Payment issue", "category": "Payment or refund", "message": "I need a check.",
                            "attachmentUrl": "http://example.com/file.jpg"}, as_=self.user)
        self.assertEqual(invalid.status_code, 400)
        ticket = self.post("/api/support/me/", {"subject": "Payment issue", "category": "Payment or refund", "message": "I need a check.",
                            "attachmentUrl": "https://example.com/file.jpg"}, as_=self.maker)
        self.assertEqual(ticket.status_code, 201, ticket.data)
        self.assertEqual(ticket.data["data"]["ticket"]["requester"]["type"], "remaker")
        self.assertEqual(ticket.data["data"]["ticket"]["priority"], SupportTicket.Priority.HIGH)

    def test_shared_team_inbox_assignment_and_per_agent_read_receipts(self):
        second_agent = self.make_admin("second-support@example.com", modules={"support": "edit"})
        super_admin = self.make_admin(
            "super-support@example.com", permission_level=Admins.PermissionLevel.SUPER_ADMIN,
        )
        created = self.post("/api/support/me/", {
            "subject": "Need help with delivery", "message": "Can the team check this delivery?",
        }, as_=self.user)
        ticket_id = created.data["data"]["ticket"]["id"]

        first = self.get("/api/support/admin/", as_=self.agent).data["data"]
        second = self.get("/api/support/admin/", as_=second_agent).data["data"]
        self.assertEqual(first["unread_count"], 1)
        self.assertEqual(second["unread_count"], 1)
        self.assertTrue(first["tickets"][0]["unread"])
        self.assertIn(second_agent.public_id, [agent["id"] for agent in first["support_agents"]])
        self.assertIn(super_admin.public_id, [agent["id"] for agent in first["support_agents"]])

        opened = self.get(f"/api/support/admin/{ticket_id}/", as_=self.agent)
        self.assertFalse(opened.data["data"]["ticket"]["unread"])
        self.assertEqual(SupportTicketAdminRead.objects.filter(ticket__public_id=ticket_id, admin=self.agent).count(), 1)
        self.assertEqual(self.get("/api/support/admin/", as_=self.agent).data["data"]["unread_count"], 0)
        self.assertEqual(self.get("/api/support/admin/", as_=second_agent).data["data"]["unread_count"], 1)

        assigned = self.post(f"/api/support/admin/{ticket_id}/", {
            "action": "assign", "assignee_id": second_agent.public_id,
        }, as_=self.agent)
        self.assertEqual(assigned.status_code, 200, assigned.data)
        self.assertEqual(assigned.data["data"]["ticket"]["assignedTo"]["id"], second_agent.public_id)
        self.assertEqual(self.get(f"/api/support/admin/{ticket_id}/", as_=super_admin).status_code, 200)

        replied = self.post(f"/api/support/admin/{ticket_id}/", {
            "action": "reply", "message": "We are checking the delivery now.",
        }, as_=second_agent)
        self.assertEqual(replied.status_code, 200, replied.data)
        member_list = self.get("/api/support/me/", as_=self.user).data["data"]
        self.assertEqual(member_list["unread_count"], 1)
        self.assertTrue(member_list["tickets"][0]["unread"])
        member_detail = self.get(f"/api/support/me/{ticket_id}/", as_=self.user).data["data"]["ticket"]
        self.assertFalse(member_detail["unread"])
        self.assertEqual(self.get("/api/support/me/", as_=self.user).data["data"]["unread_count"], 0)
