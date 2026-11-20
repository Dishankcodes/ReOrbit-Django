"""Share an order's tracking with someone who has no ReOrbit account (family at home, a neighbour,
the person receiving a gift).

POST /api/orders/me/<ORD>/share/      the buyer       -> {"token", "expires_in_days"}
POST /api/orders/sales/<ORD>/share/   the seller      -> same
GET  /api/orders/track/<token>/       anyone, no login -> the public tracking view

The link is signed (Django signing, its own salt), so it can't be guessed or edited into another
order, and it stops working TRACK_DAYS after it was made. The public view shows only what a courier's
tracking page would: status, steps, courier and tracking number, the item, the seller's shop name and
the delivery city/pincode. Never the street address, phone, buyer name, payment or prices.
"""

from django.core import signing
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.accounts.permissions import IsReOrbitAuthenticated
from apps.core import buyers
from apps.core.responses import fail, ok
from apps.core.throttles import _Shared
from .models import Order
from .serializers import media_url, seller_of

SALT = "reorbit.order-track"
TRACK_DAYS = 30
# events a stranger may see (labels only, never the details, which can hold notes or amounts)
PUBLIC_EVENTS = {
    "Order placed", "Payment received", "Packed", "Ready for pickup", "Handed to ReOrbit Delivery", "Shipped",
    "Out for delivery", "Delivered", "Delivery failed", "Delivery retried", "Returned to seller", "Cancelled",
}


class TrackThrottle(_Shared, AnonRateThrottle):
    scope = "order_track"
    rate = "60/min"


def make_token(order):
    return signing.dumps({"o": order.public_id}, salt=SALT, compress=True)


def read_token(token):
    """The order for a share link, or None when it is fake, edited or too old."""
    try:
        data = signing.loads(str(token or ""), salt=SALT, max_age=TRACK_DAYS * 86400)
    except signing.BadSignature:  # also SignatureExpired
        return None
    return Order.objects.filter(public_id=data.get("o")).select_related("seller_user", "seller_remaker").first()


def public_view(o, request):
    from .services import tracking_url

    lines = list(o.lines.all())
    first = lines[0] if lines else None
    seller = seller_of(o)
    name = seller["name"]
    if seller["type"] == "remaker" and o.seller_remaker_id:
        p = getattr(o.seller_remaker, "profile", None)
        name = (getattr(p, "studio_name", "") or "") or o.seller_remaker.username or name
    elif seller["type"] == "user":
        name = name.split()[0] if name else "A ReOrbit member"  # first name only
    addr = o.address or {}
    return {
        "id": o.public_id, "status": o.status,
        "item": {"title": (first.title if first else o.public_id) + (f" + {len(lines) - 1} more" if len(lines) > 1 else ""),
                 "image": media_url(request, first.cover) if first and first.cover else None,
                 "qty": sum(ln.qty for ln in lines)},
        "seller": {"type": seller["type"], "name": name},
        "delivery": "ReOrbit Delivery" if o.managed_delivery else "Courier",
        "courier": {"name": o.courier_name, "tracking_no": o.tracking_no,
                    "tracking_url": tracking_url(o.courier_name, o.tracking_no)} if o.tracking_no else None,
        "to": {"city": addr.get("city", ""), "pincode": addr.get("pincode", "")},
        "placed_at": o.created_at, "confirmed_at": o.confirmed_at, "shipped_at": o.shipped_at,
        "delivered_at": o.delivered_at, "cancelled_at": o.cancelled_at,
        "events": [{"label": e.label, "at": e.created_at}
                   for e in o.events.all().order_by("created_at", "pk") if e.label in PUBLIC_EVENTS],
    }


def _share(o):
    return ok({"token": make_token(o), "expires_in_days": TRACK_DAYS},
              message=f"Anyone with this link can follow the delivery for {TRACK_DAYS} days, without signing in.")


class MyOrderShare(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def post(self, request, public_id):
        return _share(get_object_or_404(Order, public_id=public_id, buyer_key=buyers.key_of(request.user.account)))


class SalesShare(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def post(self, request, public_id):
        from .views import SalesList  # local import: views imports this module's urls

        base = SalesList.scope(request)
        if base is None:
            return fail("Only members and ReMakers have sales.", status=403)
        return _share(get_object_or_404(Order, public_id=public_id, pk__in=base.values("pk")))


class PublicTrack(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [TrackThrottle]

    def get(self, request, token):
        o = read_token(token)
        if o is None or o.status == Order.Status.PENDING_PAYMENT:
            return fail("This tracking link isn't valid or has expired. Ask the person who shared it for a new one.",
                        status=404, code="TRACK_LINK_INVALID")
        o = Order.objects.prefetch_related("lines", "events").select_related(
            "seller_user", "seller_remaker", "seller_remaker__profile").get(pk=o.pk)
        return ok({"order": public_view(o, request)})
