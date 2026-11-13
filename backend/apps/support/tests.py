from apps.core.testing import APIBase
from .models import SupportTicket, TicketMessage


class SupportTicketTests(APIBase):
    def setUp(self):
        super().setUp()
        self.user = self.make_user("help-user@example.com")
        self.other = self.make_user("other-user@example.com")
        self.maker = self.make_remaker()
        self.agent = self.make_admin("support@example.com", modules={"support": "edit"})

    def test_create_reply_assignment_resolution_and_owner_isolation(self):
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
        self.assertEqual(self.post(f"/api/support/me/{ticket_id}/", {"message": "Thanks"}, as_=self.user).status_code, 409)

    def test_only_ticket_owner_can_reference_an_order_and_attachment_is_https(self):
        invalid = self.post("/api/support/me/", {"subject": "Payment issue", "message": "I need a check.",
                            "attachmentUrl": "http://example.com/file.jpg"}, as_=self.user)
        self.assertEqual(invalid.status_code, 400)
        ticket = self.post("/api/support/me/", {"subject": "Payment issue", "message": "I need a check.",
                            "attachmentUrl": "https://example.com/file.jpg"}, as_=self.maker)
        self.assertEqual(ticket.status_code, 201, ticket.data)
        self.assertEqual(ticket.data["data"]["ticket"]["requester"]["type"], "remaker")
