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
        spoken = [m for m in reply.data["data"]["ticket"]["messages"] if m["senderType"] != "system"]
        self.assertEqual(len(spoken), 3)
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


class TicketHistoryTests(APIBase):
    """What the conversation records, and the rules around opening a second ticket."""

    def setUp(self):
        super().setUp()
        self.user = self.make_user("history-user@example.com")
        self.agent = self.make_admin("history-agent@example.com", modules={"support": "edit"})
        self.second = self.make_admin("history-second@example.com", modules={"support": "edit"})
        made = self.post("/api/support/me/", {"subject": "Delivery is late", "message": "Where is my order?"}, as_=self.user)
        self.assertEqual(made.status_code, 201, made.data)
        self.tid = made.data["data"]["ticket"]["id"]

    def notes(self, who=None):
        t = self.get(f"/api/support/admin/{self.tid}/", as_=who or self.agent).data["data"]["ticket"]
        return [m["text"] for m in t["messages"] if m["senderType"] == "system"], t

    def test_assigning_changing_status_and_priority_leave_notes_both_sides_can_see(self):
        self.post(f"/api/support/admin/{self.tid}/", {"action": "assign", "assignee_id": self.second.public_id}, as_=self.agent)
        self.post(f"/api/support/admin/{self.tid}/", {"action": "in_progress", "priority": "High"}, as_=self.second)
        self.post(f"/api/support/admin/{self.tid}/", {"action": "assign", "assignee_id": "none"}, as_=self.second)
        notes, ticket = self.notes()
        self.assertEqual(len(notes), 4)
        self.assertIn("assigned this ticket to " + self.second.full_name, notes[0])
        self.assertTrue(any("priority from Normal to High" in n for n in notes))
        self.assertTrue(any("In progress" in n for n in notes))
        self.assertIn("unassigned", notes[-1])
        self.assertEqual(ticket["priority"], "High")
        mine = self.get(f"/api/support/me/{self.tid}/", as_=self.user).data["data"]["ticket"]
        self.assertEqual(sum(m["senderType"] == "system" for m in mine["messages"]), 4)

    def test_priority_has_its_own_action_that_leaves_the_status_alone(self):
        r = self.post(f"/api/support/admin/{self.tid}/", {"action": "priority", "priority": "Urgent"}, as_=self.agent)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual((r.data["data"]["ticket"]["priority"], r.data["data"]["ticket"]["status"]), ("Urgent", "Open"))
        self.assertEqual(self.post(f"/api/support/admin/{self.tid}/", {"action": "priority"}, as_=self.agent).status_code, 400)
        self.assertEqual(self.post(f"/api/support/admin/{self.tid}/", {"action": "priority", "priority": "Huge"}, as_=self.agent).status_code, 400)

    def test_notes_do_not_count_as_messages_or_replace_the_last_message(self):
        self.post(f"/api/support/admin/{self.tid}/", {"action": "assign"}, as_=self.agent)
        row = self.get("/api/support/admin/", as_=self.agent).data["data"]["tickets"][0]
        self.assertEqual(row["messageCount"], 1)
        self.assertEqual(row["lastMessage"]["text"], "Where is my order?")
        mine = self.get("/api/support/me/", as_=self.user).data["data"]["tickets"][0]
        self.assertEqual(mine["messageCount"], 1)
        self.assertFalse(mine["unread"])  # a note is not a reply

    def test_a_plain_reply_adds_no_note_and_a_member_resolving_does(self):
        self.post(f"/api/support/admin/{self.tid}/", {"action": "reply", "message": "On it."}, as_=self.agent)
        self.assertEqual(self.notes()[0], [])
        self.post(f"/api/support/me/{self.tid}/", {"action": "close"}, as_=self.user)
        notes, ticket = self.notes()
        self.assertEqual(ticket["status"], "Resolved")
        self.assertIn("marked this ticket as resolved", notes[0])
        self.post(f"/api/support/me/{self.tid}/", {"message": "It is still late."}, as_=self.user)
        self.assertIn("reopened", self.notes()[0][-1])


class TicketRightsTests(SupportTicketTests):
    """Super Admins, Support agents and the assigned admin can close a ticket; nobody else."""

    def test_super_admin_agent_and_assignee_can_close(self):
        from apps.admins.models import Admins
        sup = self.make_admin("super@example.com", permission_level=Admins.PermissionLevel.SUPER_ADMIN)
        helper = self.make_admin("helper@example.com", modules={"support": "view"})
        ids = [self.post("/api/support/me/", {"subject": f"Help {n}", "message": "Please help me with this."},
                         as_=self.user).data["data"]["ticket"]["id"] for n in range(3)]
        A = "/api/support/admin/{}/"
        self.assertEqual(self.post(A.format(ids[0]), {"action": "close"}, as_=sup).status_code, 200)
        self.assertEqual(self.post(A.format(ids[1]), {"action": "close"}, as_=self.agent).status_code, 200)
        # a view-only admin can't touch a ticket that isn't theirs...
        self.assertEqual(self.post(A.format(ids[2]), {"action": "close"}, as_=helper).status_code, 403)
        r = self.post(A.format(ids[2]), {"action": "assign", "assignee_id": helper.public_id}, as_=self.agent)
        self.assertEqual(r.status_code, 200, r.data)
        # ...but can once it's assigned to them (still can't reassign it)
        self.assertEqual(self.post(A.format(ids[2]), {"action": "close"}, as_=helper).status_code, 200)
        self.assertEqual(self.post(A.format(ids[2]), {"action": "assign", "assignee_id": "none"}, as_=helper).status_code, 403)


class PublicContactTests(SupportTicketTests):
    def test_contact_form_links_to_the_account_or_tells_the_team(self):
        from apps.admins.models import Admins
        from apps.core.models import Notification
        from apps.core.support_contacts import support_emails
        boss = self.make_admin("boss@example.com", permission_level=Admins.PermissionLevel.SUPER_ADMIN)
        self.make_admin("boss2@example.com", permission_level=Admins.PermissionLevel.SUPER_ADMIN)
        self.assertEqual(support_emails()[:2], ["boss@example.com", "boss2@example.com"])
        rules = self.client.get("/api/core/settings/").data["data"]
        rules = rules.get("settings", rules)
        self.assertEqual((rules["supportEmail"], rules["supportEmails"][1]), ("boss@example.com", "boss2@example.com"))

        bad = self.client.post("/api/support/contact/", {"name": "A", "email": "x", "topic": "?", "subject": "", "message": ""}, format="json")
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(set(bad.data["errors"]), {"name", "email", "topic", "subject", "message"})

        # a blocked member appeals: it becomes a ticket on their account
        self.user.status, self.user.status_reason = "Blocked", "Spam"
        self.user.save()
        r = self.client.post("/api/support/contact/", {"name": "Help User", "email": self.user.email, "topic": "blocked",
                                                       "subject": "Please unblock me", "message": "I think this was a mistake."}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        from apps.support.models import ContactMessage

        t = ContactMessage.objects.get(public_id=r.data["data"]["reference"]).ticket
        self.assertEqual((t.user_id, t.category, t.priority), (self.user.pk, "Account access", "High"))
        self.assertTrue(Notification.objects.filter(admin=boss, module="support").exists())

        # someone without an account: the team is told, no ticket
        n = SupportTicket.objects.count()
        r = self.client.post("/api/support/contact/", {"name": "Visitor", "email": "visitor@example.com", "topic": "other",
                                                       "subject": "Partnership", "message": "We'd like to partner with you."}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertNotIn("linked", r.data["data"])  # the answer never says whether the email has an account
        self.assertEqual(SupportTicket.objects.count(), n)


class SidebarBadgeTests(SupportTicketTests):
    def test_closed_tickets_never_count_as_unread(self):
        self.post("/api/support/me/", {"subject": "Need help now", "message": "Please help me with this."}, as_=self.user)
        page = self.get("/api/support/admin/", as_=self.agent).data["data"]
        before = page["unread_count"]
        self.assertGreaterEqual(before, 1)
        for t in SupportTicket.objects.all():
            t.status = SupportTicket.Status.CLOSED
            t.save(update_fields=["status"])
        self.assertEqual(self.get("/api/support/admin/", as_=self.agent).data["data"]["unread_count"], 0)


class ContactInboxTests(SupportTicketTests):
    def test_visitor_message_lands_in_the_inbox_and_gets_a_reply(self):
        from django.core import mail
        from apps.core.models import Notification
        from apps.support.models import ContactMessage
        mail.outbox.clear()
        r = self.client.post("/api/support/contact/", {"name": "Riya Shah", "email": "riya@example.com", "topic": "other",
                                                       "subject": "Partnership idea", "message": "We run a thrift store and want to list."}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        ref = r.data["data"]["reference"]
        m = ContactMessage.objects.get(public_id=ref)
        self.assertEqual((m.status, m.ticket_id), ("New", None))
        # the team is emailed and the visitor gets an acknowledgement with the reference
        subjects = [e.subject for e in mail.outbox]
        self.assertTrue(any(ref in s and "[ReOrbit contact]" in s for s in subjects))
        ack = [e for e in mail.outbox if e.to == ["riya@example.com"]]
        self.assertTrue(ack and ref in ack[0].subject and ack[0].alternatives)
        self.assertTrue(Notification.objects.filter(admin=self.agent, module="support").exists())

        inbox = self.get("/api/support/admin/contact/?status=New", as_=self.agent).data["data"]
        self.assertEqual([x["id"] for x in inbox["results"]], [ref])
        self.assertEqual(inbox["counts"]["New"], 1)

        mail.outbox.clear()
        self.assertEqual(self.post(f"/api/support/admin/contact/{ref}/", {"action": "reply", "message": ""}, as_=self.agent).status_code, 400)
        r = self.post(f"/api/support/admin/contact/{ref}/", {"action": "reply", "message": "Thanks! Here's how to start."}, as_=self.agent)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["data"]["message_item"]["status"], "Replied")
        self.assertEqual(mail.outbox[0].to, ["riya@example.com"])
        self.assertIn("Here's how to start", mail.outbox[0].body)

    def test_member_message_is_a_ticket_and_recorded(self):
        from apps.support.models import ContactMessage
        r = self.client.post("/api/support/contact/", {"name": "Help User", "email": self.user.email, "topic": "purchase",
                                                       "subject": "Where is my order", "message": "My order hasn't arrived yet."}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertNotIn("linked", r.data["data"])  # same answer as for a visitor without an account
        m = ContactMessage.objects.get(public_id=r.data["data"]["reference"])
        self.assertIsNotNone(m.ticket)
        self.assertEqual(m.status, "Closed")
