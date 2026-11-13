from apps.core.testing import APIBase
from .models import Conversation, ConversationParticipant, Message, MessageNotification


class MessagingFlowTests(APIBase):
    def setUp(self):
        super().setUp()
        self.user = self.make_user("message-user@example.com")
        self.maker = self.make_remaker()
        self.admin = self.make_admin("message-admin@example.com", modules={"messages": "edit"})

    def test_user_remaker_admin_share_persistent_thread_and_unread_state(self):
        created = self.post("/api/messaging/me/", {"target_type": "remaker", "target_id": self.maker.public_id,
            "kind": "remaker", "context": {"label": "Order ORD-1001"}}, as_=self.user)
        self.assertEqual(created.status_code, 201, created.data)
        cid = created.data["data"]["conversation"]["id"]
        self.assertEqual(self.post(f"/api/messaging/me/{cid}/", {"text": "Can you share an update?"}, as_=self.user).status_code, 201)
        self.assertEqual(MessageNotification.objects.count(), 1)
        inbox = self.get("/api/messaging/me/", as_=self.maker).data["data"]["conversations"]
        self.assertEqual((inbox[0]["id"], inbox[0]["unread"]), (cid, 1))
        self.post(f"/api/messaging/me/{cid}/", {"action": "read"}, as_=self.maker)
        self.assertEqual(self.get(f"/api/messaging/me/{cid}/", as_=self.maker).data["data"]["conversation"]["unread"], 0)
        self.post(f"/api/messaging/me/{cid}/", {"text": "It ships tomorrow."}, as_=self.maker)
        detail = self.get(f"/api/messaging/me/{cid}/", as_=self.user).data["data"]["conversation"]
        self.assertEqual(len(detail["messages"]), 2)
        self.assertEqual(detail["messages"][-1]["from"], "them")

    def test_unrelated_account_cannot_read_or_send_and_bad_message_rejected(self):
        other = self.make_user("stranger@example.com")
        conv = self.post("/api/messaging/me/", {"target_type": "remaker", "target_id": self.maker.public_id}, as_=self.user).data["data"]["conversation"]["id"]
        self.assertEqual(self.get(f"/api/messaging/me/{conv}/", as_=other).status_code, 404)
        self.assertEqual(self.post(f"/api/messaging/me/{conv}/", {"text": " "}, as_=self.user).status_code, 400)

    def test_admin_can_join_and_message_only_as_participant(self):
        conv = self.post("/api/messaging/me/", {"target_type": "admin", "target_id": self.admin.public_id}, as_=self.user).data["data"]["conversation"]["id"]
        self.assertEqual(self.post(f"/api/messaging/me/{conv}/", {"text": "We received your request."}, as_=self.admin).status_code, 201)
        self.assertEqual(Conversation.objects.count(), 1)
        self.assertEqual(ConversationParticipant.objects.filter(conversation__public_id=conv).count(), 2)
