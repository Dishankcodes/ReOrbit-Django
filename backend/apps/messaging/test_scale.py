"""Scale coverage for paged conversation and message retrieval.

These tests deliberately create more data than the UI asks for in one request.
They verify that API responses stay cursor/page bounded and do not repeat rows.
"""

from apps.core.testing import APIBase
from apps.users.models import Users

from .models import Conversation, ConversationParticipant, Message


INBOX_SIZE = 1_200
HISTORY_SIZE = 1_200
PAGE_SIZE = 50


class MessagingScaleTests(APIBase):
    def setUp(self):
        super().setUp()
        self.remaker = self.make_remaker("scale-maker@example.com", "ScaleMaker")

    def test_large_inbox_stays_paged_and_has_no_duplicate_conversations(self):
        users = [
            Users(
                public_id=f"USR-SCALE-{index:04d}",
                full_name=f"Scale User {index}",
                email=f"scale-user-{index}@example.com",
            )
            for index in range(INBOX_SIZE)
        ]
        Users.objects.bulk_create(users, batch_size=250)
        users_by_public_id = {
            user.public_id: user
            for user in Users.objects.filter(public_id__startswith="USR-SCALE-")
        }

        conversations = [
            Conversation(
                public_id=f"CON-SCALE-{index:04d}",
                kind="customer",
                subject=f"Scale conversation {index}",
            )
            for index in range(INBOX_SIZE)
        ]
        Conversation.objects.bulk_create(conversations, batch_size=250)
        conversations_by_public_id = {
            conversation.public_id: conversation
            for conversation in Conversation.objects.filter(
                public_id__startswith="CON-SCALE-"
            )
        }

        participants = []
        for index in range(INBOX_SIZE):
            conversation = conversations_by_public_id[f"CON-SCALE-{index:04d}"]
            user = users_by_public_id[f"USR-SCALE-{index:04d}"]
            participants.extend(
                (
                    ConversationParticipant(
                        conversation=conversation,
                        account_type="remaker",
                        remaker=self.remaker,
                    ),
                    ConversationParticipant(
                        conversation=conversation,
                        account_type="user",
                        user=user,
                    ),
                )
            )
        ConversationParticipant.objects.bulk_create(participants, batch_size=500)

        first = self.get(
            f"/api/messaging/me/?limit={PAGE_SIZE}&offset=0", as_=self.remaker
        )
        self.assertEqual(first.status_code, 200, first.data)
        first_data = first.data["data"]
        self.assertEqual(first_data["total"], INBOX_SIZE)
        self.assertEqual(len(first_data["conversations"]), PAGE_SIZE)
        self.assertTrue(first_data["has_more"])
        self.assertEqual(first_data["next_offset"], PAGE_SIZE)

        second = self.get(
            f"/api/messaging/me/?limit={PAGE_SIZE}&offset={PAGE_SIZE}",
            as_=self.remaker,
        )
        self.assertEqual(second.status_code, 200, second.data)
        second_data = second.data["data"]
        self.assertEqual(len(second_data["conversations"]), PAGE_SIZE)
        first_ids = {row["id"] for row in first_data["conversations"]}
        second_ids = {row["id"] for row in second_data["conversations"]}
        self.assertFalse(first_ids & second_ids)

        last_offset = ((INBOX_SIZE - 1) // PAGE_SIZE) * PAGE_SIZE
        last = self.get(
            f"/api/messaging/me/?limit={PAGE_SIZE}&offset={last_offset}",
            as_=self.remaker,
        )
        self.assertEqual(last.status_code, 200, last.data)
        last_data = last.data["data"]
        self.assertEqual(len(last_data["conversations"]), INBOX_SIZE - last_offset)
        self.assertFalse(last_data["has_more"])
        self.assertIsNone(last_data["next_offset"])

    def test_long_history_is_cursor_paged_without_omitting_or_repeating_messages(self):
        member = self.make_user("scale-history@example.com")
        started = self.post(
            "/api/messaging/me/",
            {"target_type": "user", "target_id": member.public_id, "kind": "customer"},
            as_=self.remaker,
        )
        self.assertEqual(started.status_code, 201, started.data)
        conversation_id = started.data["data"]["conversation"]["id"]
        conversation = Conversation.objects.get(public_id=conversation_id)

        messages = [
            Message(
                conversation=conversation,
                sender_type="remaker" if index % 2 == 0 else "user",
                sender_remaker=self.remaker if index % 2 == 0 else None,
                sender_user=member if index % 2 else None,
                text=f"Scale history message {index}",
            )
            for index in range(HISTORY_SIZE)
        ]
        Message.objects.bulk_create(messages, batch_size=250)

        before = None
        seen = []
        while True:
            suffix = f"?before={before}" if before else ""
            response = self.get(
                f"/api/messaging/me/{conversation_id}/{suffix}", as_=self.remaker
            )
            self.assertEqual(response.status_code, 200, response.data)
            page = response.data["data"]["conversation"]
            rows = page["messages"]
            self.assertLessEqual(len(rows), PAGE_SIZE)
            self.assertTrue(rows)
            seen.extend(row["id"] for row in rows)
            if not page["has_more_messages"]:
                break
            before = page["older_cursor"]

        self.assertEqual(len(seen), HISTORY_SIZE)
        self.assertEqual(len(set(seen)), HISTORY_SIZE)

        earliest_page_last_id = seen[-1]
        forward = self.get(
            f"/api/messaging/me/{conversation_id}/?after={earliest_page_last_id}",
            as_=self.remaker,
        )
        self.assertEqual(forward.status_code, 200, forward.data)
        self.assertEqual(len(forward.data["data"]["conversation"]["messages"]), PAGE_SIZE)
