from apps.core.testing import APIBase
from .models import Conversation, ConversationParticipant, Message, MessageNotification


class MessagingFlowTests(APIBase):
    def setUp(self):
        super().setUp()
        self.user = self.make_user("message-user@example.com")
        self.maker = self.make_remaker()
        self.admin = self.make_admin("message-admin@example.com", modules={"messages": "edit"})
        self.support_agent = self.make_admin("support-agent@example.com", modules={"support": "edit"})

    def test_user_remaker_messages_persist_and_sync_read_unread_state(self):
        created = self.post("/api/messaging/me/", {"target_type": "remaker", "target_id": self.maker.public_id,
            "kind": "remaker", "context": {"label": "Order ORD-1001"}}, as_=self.user)
        self.assertEqual(created.status_code, 201, created.data)
        cid = created.data["data"]["conversation"]["id"]
        self.assertEqual(self.post(f"/api/messaging/me/{cid}/", {"text": "Can you share an update?"}, as_=self.user).status_code, 201)
        self.assertEqual(MessageNotification.objects.count(), 1)
        inbox = self.get("/api/messaging/me/", as_=self.maker).data["data"]["conversations"]
        direct_thread = next(row for row in inbox if row["id"] == cid)
        self.assertEqual(direct_thread["unread"], 1)
        unread_ids = [row["id"] for row in self.get("/api/messaging/me/", as_=self.maker).data["data"]["unread_conversations"]]
        self.assertIn(cid, unread_ids)
        self.post(f"/api/messaging/me/{cid}/", {"action": "read"}, as_=self.maker)
        self.assertEqual(self.get(f"/api/messaging/me/{cid}/", as_=self.maker).data["data"]["conversation"]["unread"], 0)
        unread_ids = [row["id"] for row in self.get("/api/messaging/me/", as_=self.maker).data["data"]["unread_conversations"]]
        self.assertNotIn(cid, unread_ids)
        self.post(f"/api/messaging/me/{cid}/", {"text": "It ships tomorrow."}, as_=self.maker)
        detail = self.get(f"/api/messaging/me/{cid}/", as_=self.user).data["data"]["conversation"]
        self.assertEqual(len(detail["messages"]), 2)
        self.assertEqual(detail["messages"][-1]["from"], "them")
        self.assertEqual(detail["context"]["label"], "Order ORD-1001")

    def test_direct_conversation_start_is_idempotent(self):
        payload = {"target_type": "remaker", "target_id": self.maker.public_id}
        first = self.post("/api/messaging/me/", payload, as_=self.user)
        second = self.post("/api/messaging/me/", payload, as_=self.user)
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(second.status_code, 201, second.data)
        self.assertEqual(first.data["data"]["conversation"]["id"], second.data["data"]["conversation"]["id"])
        self.assertEqual(Conversation.objects.count(), 1)
        self.assertEqual(ConversationParticipant.objects.count(), 2)

    def test_unrelated_account_cannot_read_or_send_and_bad_message_rejected(self):
        other = self.make_user("stranger@example.com")
        conv = self.post("/api/messaging/me/", {"target_type": "remaker", "target_id": self.maker.public_id}, as_=self.user).data["data"]["conversation"]["id"]
        self.assertEqual(self.get(f"/api/messaging/me/{conv}/", as_=other).status_code, 404)
        self.assertEqual(self.post(f"/api/messaging/me/{conv}/", {"text": " "}, as_=self.user).status_code, 400)

    def test_admin_uses_permission_checked_routes_and_private_threads_stay_private(self):
        private = self.post("/api/messaging/me/", {
            "target_type": "remaker", "target_id": self.maker.public_id,
        }, as_=self.user).data["data"]["conversation"]["id"]

        admin_inbox = self.get("/api/messaging/admin/", as_=self.admin)
        self.assertEqual(admin_inbox.status_code, 200)
        self.assertNotIn(private, [row["id"] for row in admin_inbox.data["data"]["conversations"]])
        self.assertEqual(self.get(f"/api/messaging/admin/{private}/", as_=self.admin).status_code, 404)
        self.assertEqual(self.post(f"/api/messaging/me/{private}/", {"text": "No access"}, as_=self.admin).status_code, 403)
        self.assertEqual(self.get("/api/messaging/me/", as_=self.admin).status_code, 403)

        started = self.post("/api/messaging/admin/", {
            "target_type": "user", "target_id": self.user.public_id,
            "kind": "buyer", "context": {"label": "Support follow-up"},
        }, as_=self.admin)
        self.assertEqual(started.status_code, 201, started.data)
        conv = started.data["data"]["conversation"]["id"]
        sent = self.post(f"/api/messaging/admin/{conv}/", {"text": "We received your request."}, as_=self.admin)
        self.assertEqual(sent.status_code, 201, sent.data)
        self.assertEqual(self.get(f"/api/messaging/admin/{conv}/", as_=self.admin).status_code, 200)
        user_inbox = self.get("/api/messaging/me/", as_=self.user).data["data"]
        self.assertIn(conv, [row["id"] for row in user_inbox["conversations"]])
        self.assertIn(conv, [row["id"] for row in user_inbox["unread_conversations"]])
        self.post(f"/api/messaging/me/{conv}/", {"action": "read"}, as_=self.user)
        self.post(f"/api/messaging/me/{conv}/", {"text": "I received your update."}, as_=self.user)
        admin_detail = self.get(f"/api/messaging/admin/{conv}/", as_=self.admin).data["data"]["conversation"]
        self.assertEqual(admin_detail["unread"], 1)
        self.post(f"/api/messaging/admin/{conv}/", {"action": "read"}, as_=self.admin)
        admin_detail = self.get(f"/api/messaging/admin/{conv}/", as_=self.admin).data["data"]["conversation"]
        self.assertEqual(admin_detail["unread"], 0)
        self.assertEqual(Conversation.objects.count(), 3)
        self.assertEqual(ConversationParticipant.objects.filter(conversation__public_id=conv).count(), 2)

    def test_admin_module_permission_is_required_for_list_create_and_detail(self):
        no_messages = self.make_admin("no-messages@example.com", modules={"orders": "edit"})
        created = self.post("/api/messaging/admin/", {
            "target_type": "user", "target_id": self.user.public_id,
        }, as_=self.admin)
        conversation_id = created.data["data"]["conversation"]["id"]
        self.assertEqual(self.get("/api/messaging/admin/", as_=no_messages).status_code, 403)
        self.assertEqual(self.get(f"/api/messaging/admin/{conversation_id}/", as_=no_messages).status_code, 403)
        self.assertEqual(self.post("/api/messaging/admin/", {
            "target_type": "user", "target_id": self.user.public_id,
        }, as_=no_messages).status_code, 403)

    def test_message_history_uses_cursor_pages(self):
        conv = self.post("/api/messaging/me/", {
            "target_type": "remaker", "target_id": self.maker.public_id,
        }, as_=self.user).data["data"]["conversation"]["id"]
        for index in range(55):
            response = self.post(f"/api/messaging/me/{conv}/", {"text": f"Message {index}"}, as_=self.user)
            self.assertEqual(response.status_code, 201, response.data)

        latest = self.get(f"/api/messaging/me/{conv}/", as_=self.user).data["data"]["conversation"]
        self.assertEqual(len(latest["messages"]), 50)
        self.assertTrue(latest["has_more_messages"])
        older = self.get(f"/api/messaging/me/{conv}/?before={latest['older_cursor']}", as_=self.user).data["data"]["conversation"]
        self.assertEqual(len(older["messages"]), 5)
        self.assertFalse(older["has_more_messages"])
        newer = self.get(f"/api/messaging/me/{conv}/?after={older['newer_cursor']}", as_=self.user).data["data"]["conversation"]
        self.assertEqual(len(newer["messages"]), 50)

    def test_archiving_support_thread_does_not_strand_member(self):
        inbox = self.get("/api/messaging/me/", as_=self.user)
        support = next(row for row in inbox.data["data"]["conversations"] if row["kind"] == "reorbit")
        conversation_id = support["id"]
        self.assertTrue(self.post(f"/api/messaging/me/{conversation_id}/", {"action": "archive"}, as_=self.user).data["success"])
        refreshed = self.get("/api/messaging/me/", as_=self.user)
        self.assertIn(conversation_id, [row["id"] for row in refreshed.data["data"]["conversations"]])

    def test_support_team_shares_reorbit_thread_without_exposing_private_messages(self):
        second_agent = self.make_admin("second-support@example.com", modules={"support": "edit"})
        user_inbox = self.get("/api/messaging/me/", as_=self.user)
        support = next(row for row in user_inbox.data["data"]["conversations"] if row["kind"] == "reorbit")
        conversation_id = support["id"]
        for agent in (self.support_agent, second_agent):
            inbox = self.get("/api/messaging/admin/", as_=agent)
            self.assertEqual(inbox.status_code, 200, inbox.data)
            self.assertIn(conversation_id, [row["id"] for row in inbox.data["data"]["conversations"]])

        self.assertEqual(self.post(
            f"/api/messaging/me/{conversation_id}/", {"text": "I need help with my order."}, as_=self.user
        ).status_code, 201)
        first = self.get("/api/messaging/admin/", as_=self.support_agent).data["data"]
        second = self.get("/api/messaging/admin/", as_=second_agent).data["data"]
        self.assertEqual(next(row for row in first["conversations"] if row["id"] == conversation_id)["unread"], 1)
        self.assertEqual(next(row for row in second["conversations"] if row["id"] == conversation_id)["unread"], 1)
        self.assertEqual(self.post(
            f"/api/messaging/admin/{conversation_id}/", {"text": "A support agent is checking this."}, as_=second_agent
        ).status_code, 201)
        self.assertEqual(self.get(f"/api/messaging/admin/{conversation_id}/", as_=self.support_agent).status_code, 200)

        private = self.post("/api/messaging/me/", {
            "target_type": "remaker", "target_id": self.maker.public_id,
        }, as_=self.user).data["data"]["conversation"]["id"]
        support_only_ids = [row["id"] for row in self.get(
            "/api/messaging/admin/", as_=self.support_agent
        ).data["data"]["conversations"]]
        self.assertNotIn(private, support_only_ids)
        self.assertEqual(self.get(f"/api/messaging/admin/{private}/", as_=self.support_agent).status_code, 404)
