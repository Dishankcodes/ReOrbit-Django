"""A courier order the buyer never confirms: reminded, then marked delivered by itself."""

from datetime import timedelta

from django.core import mail
from django.utils import timezone

from apps.core.models import Notification
from apps.payments.models import WalletEntry
from apps.support.models import SupportTicket

from . import services
from .models import Order, OrderEvent
from .tests_post_delivery import PostDeliveryBase


class AutoConfirmTests(PostDeliveryBase):
    def shipped(self, days_ago, method="RAZORPAY", item=None):
        item = item or self.table  # a ReMaker product the seller ships with a courier
        oid = self.place(item, method=method)
        self.ship(oid, item)
        Order.objects.filter(public_id=oid).update(shipped_at=timezone.now() - timedelta(days=days_ago))
        return oid

    def status(self, oid):
        return Order.objects.get(public_id=oid).status

    def test_reminder_once_then_delivered_after_the_days(self):
        days = services.AUTO_CONFIRM_DAYS
        oid = self.shipped(days - 1)
        mail.outbox.clear()
        self.assertEqual(services.auto_confirm_due(), 0)
        self.assertEqual(self.status(oid), "Shipped")
        self.assertEqual(OrderEvent.objects.filter(order__public_id=oid, label=services.REMINDER_LABEL).count(), 1)
        self.assertTrue(Notification.objects.filter(user=self.buyer, title="Did your order arrive?").exists())
        self.assertEqual(len(mail.outbox), 1)
        services.auto_confirm_due()  # runs again: no second reminder
        self.assertEqual(OrderEvent.objects.filter(order__public_id=oid, label=services.REMINDER_LABEL).count(), 1)

        Order.objects.filter(public_id=oid).update(shipped_at=timezone.now() - timedelta(days=days, hours=1))
        self.assertEqual(services.auto_confirm_due(), 1)
        o = Order.objects.get(public_id=oid)
        self.assertEqual(o.status, "Delivered")
        ev = o.events.filter(label="Delivered").get()
        self.assertEqual(ev.actor, "system")
        self.assertIn("automatically", ev.detail)
        self.assertTrue(WalletEntry.objects.filter(order=o, kind="Earning").exists())  # the seller is paid as usual

    def test_buyer_page_shows_the_date(self):
        oid = self.shipped(1)
        r = self.get(f"/api/orders/me/{oid}/", as_=self.buyer)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertIsNotNone(r.data["data"]["order"]["auto_confirm_on"])

    def test_open_ticket_stops_it(self):
        oid = self.shipped(services.AUTO_CONFIRM_DAYS + 1)
        t = SupportTicket.objects.create(user=self.buyer, subject="Never arrived", category="Orders", order_id=oid)
        self.assertEqual(services.auto_confirm_due(), 0)
        self.assertEqual(self.status(oid), "Shipped")
        t.status = "Resolved"
        t.save(update_fields=["status"])
        self.assertEqual(services.auto_confirm_due(), 1)
        self.assertEqual(self.status(oid), "Delivered")

    def test_cod_waits_for_the_cash_and_managed_is_skipped(self):
        oid = self.shipped(services.AUTO_CONFIRM_DAYS + 1, method="COD")
        services.auto_confirm_due()
        o = Order.objects.get(public_id=oid)
        self.assertEqual((o.status, o.payment_status), ("Delivered", "COD_Collected"))
        self.assertIsNone(WalletEntry.objects.get(order=o, kind="Earning").available_at)  # clears once ReOrbit has the cash

        managed = self.shipped(30, item=self.lamp)  # "Managed by ReOrbit": the pickup team delivers it
        self.assertTrue(Order.objects.get(public_id=managed).managed_delivery)
        services.auto_confirm_due()
        self.assertEqual(self.status(managed), "Shipped")
