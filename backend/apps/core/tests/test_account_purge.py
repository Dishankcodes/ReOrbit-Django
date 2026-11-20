"""After the 30 days, a deleted account's photos and messages go too (audit L5)."""

import os

from django.conf import settings

from apps.core.account_deletion import REMOVED_TEXT, purge
from apps.core.tests.test_profile import image_file
from apps.listings.models import MediaImage
from apps.messaging.models import Conversation, Message
from apps.orders.models import OrderItem
from apps.orders.tests_post_delivery import PostDeliveryBase
from apps.support.models import SupportTicket, TicketAttachment, TicketMessage


class PurgeContentTests(PostDeliveryBase):
    def path(self, name):
        return os.path.join(settings.MEDIA_ROOT, name)

    def test_photos_and_messages_removed_but_order_records_keep_their_picture(self):
        cover = MediaImage.objects.create(remaker_product=self.table, image=image_file(name="cover.png"),
                                          image_type="Cover", display_order=0)
        extra = MediaImage.objects.create(remaker_product=self.table, image=image_file(name="extra.png"),
                                          display_order=1)
        oid = self.place(self.table, method="RAZORPAY")
        self.assertEqual(OrderItem.objects.get(order__public_id=oid).cover, cover.image.name)

        c = Conversation.objects.create(subject="Teak table")
        mine = Message.objects.create(conversation=c, sender_type="remaker", sender_remaker=self.maker,
                                      text="My number is 98765 43210", attachment_url="data:image/png;base64,xx")
        theirs = Message.objects.create(conversation=c, sender_type="user", sender_user=self.buyer, text="Thanks!")
        t = SupportTicket.objects.create(remaker=self.maker, subject="Payout", category="Payments")
        m = TicketMessage.objects.create(ticket=t, sender_type="remaker", remaker=self.maker, text="My UPI is x@upi")
        reply = TicketMessage.objects.create(ticket=t, sender_type="admin", admin=self.boss, text="We updated x@upi for you")
        att = TicketAttachment.objects.create(message=m, image=image_file(name="screen.png"))
        extra_path, att_path, cover_path = self.path(extra.image.name), self.path(att.image.name), self.path(cover.image.name)

        with self.captureOnCommitCallbacks(execute=True):
            purge(self.maker)

        self.assertFalse(MediaImage.objects.filter(pk=extra.pk).exists())
        self.assertFalse(os.path.exists(extra_path))
        self.assertTrue(MediaImage.objects.filter(pk=cover.pk).exists())  # the buyer's order still shows it
        self.assertTrue(os.path.exists(cover_path))
        self.assertFalse(TicketAttachment.objects.filter(pk=att.pk).exists())
        self.assertFalse(os.path.exists(att_path))
        for row in (m, reply):
            row.refresh_from_db()
            self.assertEqual(row.text, REMOVED_TEXT)
        mine.refresh_from_db()
        theirs.refresh_from_db()
        self.assertEqual((mine.text, mine.attachment_url), (REMOVED_TEXT, ""))
        self.assertEqual(theirs.text, "Thanks!")  # the other person's own message stays
