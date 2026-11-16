"""Admin operations API (mounted at /api/adminops/).

Admin
  GET admin/dashboard/    the control-centre numbers: people, listings, impact, what is waiting, recent activity
  GET admin/operations/   every work queue with its size: orders to pack or ship, returns, refunds, donations,
                          pickups, payouts, warehouse alerts, complaints and support
Each block is only filled in when the admin's role can open that area; the rest stay at zero.
"""

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin
from apps.admins.models import AdminItem
from apps.analytics import aggregate
from apps.complaints.models import Complaint
from apps.core.responses import ok
from apps.donations.models import Donation
from apps.listings.models import Item
from apps.orders.models import Order, OrderItem
from apps.payments.models import Payout
from apps.pickups.models import PickupRequest
from apps.remakers.models import ReMakers, RemakerProduct
from apps.support.models import SupportTicket
from apps.users.models import Users
from apps.warehouse.models import WarehouseItem

OPEN_COMPLAINT = ("Open", "Under_Review")
OPEN_SUPPORT = ("Open", "In progress")
IN_HAND = ("Picked_Up", "Received", "Completed")


def _iso(dt):
    return dt.isoformat() if dt else None


def _counts(qs, field):
    return {r[field]: r["n"] for r in qs.order_by().values(field).annotate(n=Count("pk"))}


def operations_data(admin):
    """The size of every queue the team works through."""
    can = admin.has_module
    out = {}

    if can("orders"):
        by = _counts(Order.objects.filter(confirmed_at__isnull=False), "status")
        out["orders"] = {
            "to_pack": by.get("Confirmed", 0), "to_ship": by.get("Packed", 0), "in_transit": by.get("Shipped", 0),
            "delivery_failed": by.get("Delivery_Failed", 0),
            "returns_open": Order.objects.filter(return_request__status__in=aggregate.OPEN_ORDER_RETURNS).count(),
            "refunds_due": Order.objects.filter(payment_status__in=("Refund_Pending", "Refund_Failed")).count(),
            "cod_cash_pending": (Order.objects.filter(payment__method="COD", status="Delivered", cod_received_at__isnull=True)
                                 .exclude(payment_status="Paid").count()),
        }
    if can("donations"):
        out["donations"] = {"to_review": Donation.objects.filter(status="Pending").count(),
                            "in_progress": Donation.objects.filter(status__in=("Scheduled", "Failed_Pickup", "Picked_Up", "Received")).count()}
    if can("pickups"):
        today = timezone.localdate()
        donation_open = Donation.objects.filter(status__in=("Pending", "Scheduled", "Failed_Pickup"))
        item_open = PickupRequest.objects.filter(status__in=("Requested", "Scheduled"))
        overdue = (Donation.objects.filter(status__in=("Scheduled", "Failed_Pickup"), pickup_date__lt=today).count()
                   + PickupRequest.objects.filter(status="Scheduled", pickup_date__lt=today).count())
        out["pickups"] = {"open": donation_open.count() + item_open.count(), "overdue": overdue}
    if can("earnings") or can("finance"):
        p = Payout.objects.filter(status="Pending")
        out["payouts"] = {"pending": p.count(), "pending_amount": p.aggregate(n=Sum("amount"))["n"] or 0}
    if can("warehouse"):
        items = WarehouseItem.objects.all()
        out["warehouse"] = {"alerts": aggregate.warehouse_section()["kpi"]["alerts"],
                            "at_dock": items.filter(warehouse_status="Received").count(),
                            "items": items.exclude(warehouse_status="Released").count()}
    if can("complaints"):
        c = Complaint.objects.filter(status__in=OPEN_COMPLAINT)
        out["complaints"] = {"open": c.count(), "reported_listings": c.filter(target_type="Product").count()}
    if can("support"):
        out["support"] = {"open": SupportTicket.objects.filter(status__in=OPEN_SUPPORT).count()}
    return out


class AdminOperations(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("dashboard")]

    def get(self, request):
        return ok({"operations": operations_data(request.user.account)})


# ------------------------------------------------------------------ dashboard
def _people():
    alive = lambda m: m.objects.exclude(status="Deleted")  # noqa: E731
    return {
        "users": {"total": alive(Users).count(), "active": Users.objects.filter(status="Active").count()},
        "remakers": {"total": alive(ReMakers).count(), "active": ReMakers.objects.filter(status="Active").count()},
    }


def _products():
    live = (Item.objects.filter(status="Listed").count() + RemakerProduct.objects.filter(status="Listed").count()
            + AdminItem.objects.filter(status="Listed").count())
    not_draft = (Item.objects.exclude(status="Draft").count() + RemakerProduct.objects.exclude(status="Draft").count()
                 + AdminItem.objects.exclude(status="Draft").count())
    by_category = {}
    for model in (Item, RemakerProduct, AdminItem):
        for r in model.objects.filter(status="Listed").values("category__name").annotate(n=Count("pk")):
            by_category[r["category__name"]] = by_category.get(r["category__name"], 0) + r["n"]
    return {"live": live, "off_market": max(0, not_draft - live), "by_category": by_category}


def _impact():
    """Kilos donated and items reused, the way the old Dashboard counted them."""
    kg = Donation.objects.filter(status__in=IN_HAND).aggregate(n=Sum("weight_kg"))["n"] or 0
    donated = Donation.objects.filter(status__in=IN_HAND).aggregate(n=Sum("quantity"))["n"] or 0
    sold = (OrderItem.objects.filter(order__status="Delivered").exclude(order__payment_status="Refunded")
            .aggregate(n=Sum("qty"))["n"] or 0)
    kg, reused = round(float(kg)), int(donated) + int(sold)
    return {"kg": kg, "reused": reused, "co2_tonnes": round(kg * 1.9 + reused * 4.2) / 1000}


def _feed(admin, limit=6):
    """What is waiting (needs_action) and what just happened, newest first. Real rows only."""
    can = admin.has_module
    feed = []

    def add(id, module, title, message, at, path, action="Open", needs=False):
        feed.append({"id": id, "module": module, "title": title, "message": message, "at": _iso(at),
                     "path": path, "actionLabel": action, "needsAction": needs})

    if can("donations"):
        for d in Donation.objects.select_related("donor").order_by("-created_at")[:limit]:
            waiting = d.status == "Pending"
            add(f"don-{d.public_id}", "Donations", "Donation to review" if waiting else f"Donation {d.get_status_display().lower()}",
                f"{d.donor.full_name} · {d.title} × {d.quantity}", d.created_at if waiting else d.updated_at,
                f"/admin-donations/{d.public_id}", "Review" if waiting else "Open", waiting)
    if can("orders"):
        for o in (Order.objects.filter(confirmed_at__isnull=False).select_related("seller_user", "seller_remaker")
                  .prefetch_related("lines").order_by("-created_at")[:limit]):
            ret = getattr(o, "return_request", None)
            waiting = bool(ret and ret.status in aggregate.OPEN_ORDER_RETURNS) or o.payment_status in ("Refund_Pending", "Refund_Failed")
            first = o.lines.all()[0].title if o.lines.all() else "Order"
            add(f"ord-{o.public_id}", "Orders",
                "Refund needs attention" if o.payment_status in ("Refund_Pending", "Refund_Failed")
                else "Return in progress" if waiting else "New order",
                f"{o.public_id} · {first} · ₹{o.total:,}", o.updated_at if waiting else o.created_at,
                f"/admin-orders/{o.public_id}", "Open", waiting)
    if can("earnings") or can("finance"):
        for p in Payout.objects.filter(status="Pending").order_by("-created_at")[:limit]:
            who = p.seller_remaker or p.seller_user
            add(f"pyo-{p.public_id}", "Sales", "Payout to pay", f"{who.full_name} asked for ₹{p.amount:,}",
                p.created_at, "/admin-earnings", "Pay", True)
    if can("warehouse"):
        for i in (WarehouseItem.objects.filter(warehouse_status="Received").order_by("-received_at")[:limit]):
            add(f"whi-{i.public_id}", "Warehouse", "Item at the dock", f"{i.title} × {i.quantity} waiting to be put away",
                i.received_at, f"/admin-warehouse/{i.public_id}", "Put away", True)
    if can("complaints"):
        for c in Complaint.objects.filter(status__in=OPEN_COMPLAINT).order_by("-created_at")[:limit]:
            add(f"cmp-{c.public_id}", "Complaints", "Complaint to look at", f"{c.target_type} · {c.category}",
                c.created_at, f"/admin-complaints/{c.public_id}", "Review", True)
    if can("users"):
        for u in Users.objects.order_by("-created_at")[:3]:
            add(f"usr-{u.public_id}", "Users", "New member joined", u.full_name, u.created_at, f"/admin-users/{u.public_id}")
    if can("remakers"):
        for r in ReMakers.objects.order_by("-created_at")[:3]:
            add(f"rmk-{r.public_id}", "ReMakers", "New ReMaker joined", r.full_name, r.created_at, f"/admin-remakers/{r.public_id}")

    feed.sort(key=lambda x: x["at"] or "", reverse=True)
    approvals = [f for f in feed if f["needsAction"]]
    return {"approvals": approvals[:4], "pending_count": len(approvals), "activities": feed[:5]}


class AdminDashboard(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("dashboard")]

    def get(self, request):
        admin = request.user.account
        data = {**_people(), "products": _products(), "impact": _impact(),
                "operations": operations_data(admin), **_feed(admin)}
        return ok(data)
