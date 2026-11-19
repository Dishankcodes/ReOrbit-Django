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


    def test_incremental_inbox_sync_uses_model_attributes_and_role_filters_match_peers(self):
        other_maker = self.make_remaker(email="second-maker@example.com", username="Maker Two")  # usernames are unique
        # The poll asks "what changed since my last look", so the cursor is taken before the chats change.
        from django.utils import timezone
        since = timezone.now().isoformat()
        direct = self.post("/api/messaging/me/", {
            "target_type": "remaker", "target_id": self.maker.public_id,
        }, as_=self.user).data["data"]["conversation"]["id"]
        maker_chat = self.post("/api/messaging/me/", {
            "target_type": "remaker", "target_id": other_maker.public_id,
        }, as_=self.maker).data["data"]["conversation"]["id"]

        # This is the incremental request shape used by the live sidebar poll.
        user_sync = self.get("/api/messaging/me/", as_=self.user, data={"since": since})  # encoded, like URLSearchParams
        self.assertEqual(user_sync.status_code, 200, user_sync.data)
        self.assertIn(direct, [row["id"] for row in user_sync.data["data"]["conversations"]])
        # the app sends the cursor in a header instead, so the address (and its CORS permission) stays the same
        header_sync = self.get("/api/messaging/me/", as_=self.user, HTTP_X_SINCE=since)
        self.assertEqual([r["id"] for r in header_sync.data["data"]["conversations"]],
                         [r["id"] for r in user_sync.data["data"]["conversations"]])
        self.assertIn("no-store", header_sync["Cache-Control"])

        maker_remaker_filter = self.get("/api/messaging/me/?kind=remaker", as_=self.maker)
        self.assertEqual(maker_remaker_filter.status_code, 200, maker_remaker_filter.data)
        self.assertEqual(
            [row["id"] for row in maker_remaker_filter.data["data"]["conversations"]],
            [maker_chat],
        )
        maker_customer_filter = self.get("/api/messaging/me/?kind=customer", as_=self.maker)
        self.assertEqual(maker_customer_filter.status_code, 200, maker_customer_filter.data)
        self.assertEqual(  # the chat a member started with this ReMaker is one of their customer chats
            [row["id"] for row in maker_customer_filter.data["data"]["conversations"]],
            [direct],
        )

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


class InboxLabelsAndContextTests(APIBase):
    """Sidebar labels, filters and the "About" card follow who is on the other end."""

    def setUp(self):
        super().setUp()
        self.user = self.make_user("label-user@example.com")
        self.friend = self.make_user("label-friend@example.com")
        self.maker = self.make_remaker()
        self.make_admin("label-support@example.com", modules={"support": "edit"})

    def start(self, who, target_type, target, **extra):
        body = {"target_type": target_type, "target_id": target.public_id, **extra}
        response = self.post("/api/messaging/me/", body, as_=who)
        self.assertEqual(response.status_code, 201, response.data)
        return response.data["data"]["conversation"]

    def rows(self, who, query=""):
        response = self.get(f"/api/messaging/me/{query}", as_=who)
        self.assertEqual(response.status_code, 200, response.data)
        return response.data["data"]

    def test_labels_and_filters_use_the_other_person_not_the_starters_kind(self):
        # The starter sends kind="seller"; that must not make the chat a "seller" for both people.
        with_friend = self.start(self.user, "user", self.friend, kind="seller")["id"]
        with_maker = self.start(self.user, "remaker", self.maker, kind="remaker")["id"]
        by_kind = {row["id"]: row["kind"] for row in self.rows(self.user)["conversations"]}
        self.assertEqual(by_kind[with_friend], "user")
        self.assertEqual(by_kind[with_maker], "remaker")
        self.assertIn("reorbit", by_kind.values())  # the shared support thread

        # the friend sees the same chat as "user" too, not "buyer"
        self.assertEqual(
            {row["id"]: row["kind"] for row in self.rows(self.friend)["conversations"]}[with_friend], "user")
        # the maker sees the user as a customer
        self.assertEqual(
            {row["id"]: row["kind"] for row in self.rows(self.maker)["conversations"]}[with_maker], "customer")

        def ids(query):
            return [row["id"] for row in self.rows(self.user, query)["conversations"]]

        self.assertEqual(ids("?kind=user"), [with_friend])
        self.assertEqual(ids("?kind=remaker"), [with_maker])
        self.assertEqual(len(ids("?kind=reorbit")), 1)
        self.assertEqual(len(ids("?kind=all")), 3)
        self.assertEqual(ids("?kind=nonsense"), [])

        counts = self.rows(self.user)["counts"]
        self.assertEqual((counts["all"], counts["user"], counts["remaker"], counts["reorbit"]), (3, 1, 1, 1))

    def test_unread_filter_and_kind_filter_combine(self):
        chat = self.start(self.user, "user", self.friend)["id"]
        self.post(f"/api/messaging/me/{chat}/", {"text": "hi"}, as_=self.user)
        unread = self.rows(self.friend, "?filter=unread&kind=user")["conversations"]
        self.assertEqual([row["id"] for row in unread], [chat])
        self.assertEqual(self.rows(self.friend, "?filter=unread&kind=remaker")["conversations"], [])

    def test_about_card_only_for_real_contexts_and_link_belongs_to_the_starter(self):
        blank = self.start(self.user, "remaker", self.maker, context={})
        self.assertIsNone(blank["context"])  # opened from a profile: no empty "About" box

        about = self.start(self.friend, "remaker", self.maker, context={
            "label": "Order ORD-1", "to": "/user-orders/ORD-1", "image": ""})
        self.assertEqual(about["context"]["label"], "Order ORD-1")
        self.assertTrue(about["context"]["mine"])
        theirs = self.get(f"/api/messaging/me/{about['id']}/", as_=self.maker).data["data"]["conversation"]
        self.assertFalse(theirs["context"]["mine"])  # the maker must not be sent to the buyer's order page

        support = next(row for row in self.rows(self.user)["conversations"] if row["kind"] == "reorbit")
        self.assertIsNone(support["context"])  # support threads never show "About"

    def test_open_chat_reports_that_its_messages_are_loaded(self):
        chat = self.start(self.user, "user", self.friend)["id"]
        listed = next(row for row in self.rows(self.user)["conversations"] if row["id"] == chat)
        self.assertFalse(listed["messages_loaded"])
        opened = self.get(f"/api/messaging/me/{chat}/", as_=self.user).data["data"]["conversation"]
        self.assertTrue(opened["messages_loaded"])


class AdminLabelsAndPhotosTests(APIBase):
    def setUp(self):
        super().setUp()
        self.user = self.make_user("photo-user@example.com")
        self.friend = self.make_user("photo-friend@example.com")
        self.stranger = self.make_user("photo-stranger@example.com")
        self.agent = self.make_admin("photo-agent@example.com", modules={"support": "edit"})

    def test_admin_sees_the_person_not_the_word_support(self):
        self.get("/api/messaging/me/", as_=self.user)  # creates this member's support thread
        inbox = self.get("/api/messaging/admin/", as_=self.agent).data["data"]
        self.assertEqual([row["kind"] for row in inbox["conversations"]], ["customer"])
        self.assertEqual(inbox["counts"]["customer"], 1)
        self.assertEqual(inbox["counts"].get("remaker", 0), 0)
        for kind, expected in (("customer", 1), ("remaker", 0)):
            rows = self.get(f"/api/messaging/admin/?kind={kind}", as_=self.agent).data["data"]["conversations"]
            self.assertEqual(len(rows), expected, kind)

    def test_photos_are_not_sent_with_the_thread_but_can_be_fetched(self):
        chat = self.post("/api/messaging/me/", {"target_type": "user", "target_id": self.friend.public_id},
                         as_=self.user).data["data"]["conversation"]["id"]
        photo = "data:image/png;base64,AAAA"
        sent = self.post(f"/api/messaging/me/{chat}/", {"image": photo}, as_=self.user)
        self.assertEqual(sent.status_code, 201, sent.data)  # sending a message creates it (same as text messages)

        thread = self.get(f"/api/messaging/me/{chat}/", as_=self.friend).data["data"]["conversation"]
        message = thread["messages"][-1]
        self.assertEqual((message["image"], message["has_image"]), ("", True))
        self.assertEqual(thread["last_message"]["image"], "")
        self.assertTrue(thread["last_message"]["has_image"])

        fetched = self.get(f"/api/messaging/me/{chat}/images/{message['id']}/", as_=self.friend)
        self.assertEqual(fetched.status_code, 200)
        self.assertEqual(fetched.data["data"]["image"], photo)
        # someone who is not in the chat gets nothing
        self.assertEqual(self.get(f"/api/messaging/me/{chat}/images/{message['id']}/", as_=self.stranger).status_code, 404)

        listed = next(row for row in self.get("/api/messaging/me/", as_=self.friend).data["data"]["conversations"]
                      if row["id"] == chat)
        self.assertEqual((listed["last_message"]["image"], listed["last_message"]["has_image"]), ("", True))
