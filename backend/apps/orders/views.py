"""Orders API (mounted at /api/orders/).

Buyer (user account)
  GET/POST addresses/            GET/PATCH/DELETE addresses/<id>/     POST addresses/<id>/default/
  POST quote/                    {items:[{id,qty}]}  -> server prices
  POST checkout/                 {items, address_id, method: RAZORPAY|COD, note}  (header Idempotency-Key)
  GET  me/                       my orders      GET me/<id>/      POST me/<id>/cancel/
Seller (user or ReMaker account)
  GET  sales/                    orders to fulfil   GET sales/<id>/
  POST sales/<id>/<pack|ship|deliver|cancel>/
Admin (module "orders")
  GET  admin/        GET admin/<id>/        POST admin/<id>/<pack|ship|deliver|cancel>/
"""

from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitAuthenticated, IsReOrbitUser
from apps.core.gujarat import canonical_city
from apps.core.models import SavedAddress
from apps.core.pagination import StandardPagination
from apps.core.responses import created, fail, ok
from apps.core.validators import validate_gujarat_pincode, validate_phone
from apps.payments import gateway
from apps.payments.models import Payment

from . import services
from .models import Order
from .serializers import address_data, order_data

MAX_ADDRESSES = 10


def _ip(request):
    return request.META.get("REMOTE_ADDR")


def _checkout_fail(e):
    return fail(e.message, errors=e.errors, status=e.status, code=e.code)


def _order_qs():
    return Order.objects.select_related("payment", "seller_user", "seller_remaker", "buyer").prefetch_related("lines")


# ------------------------------------------------------------------ addresses
def _clean_address(data, existing=None):
    errors, v = {}, {}
    has = lambda k: existing is None or k in data  # noqa: E731
    text = lambda k: " ".join(str(data.get(k) or "").split())  # noqa: E731
    if has("name"):
        v["recipient_name"] = text("name")
        if len(v["recipient_name"]) < 2:
            errors["name"] = ["Enter the receiver's name."]
    if has("phone"):
        v["phone"] = text("phone")
        try:
            validate_phone(v["phone"])
        except Exception as exc:
            errors["phone"] = [getattr(exc, "message", None) or "Enter a valid phone number."]
    if has("line1"):
        v["address_line1"] = text("line1")
        if len(v["address_line1"]) < 5:
            errors["line1"] = ["Enter the house, street and area."]
    if "line2" in data:
        v["address_line2"] = text("line2")[:255]
    if "landmark" in data:
        v["landmark"] = text("landmark")[:150]
    if has("city"):
        city = canonical_city(text("city"))
        if not city:
            errors["city"] = ["Choose one of the Gujarat cities from the list."]
        v["city"] = city or ""
    if has("pincode"):
        try:
            v["pincode"] = validate_gujarat_pincode(text("pincode")) or ""
        except Exception as exc:
            errors["pincode"] = [getattr(exc, "message", None) or "Enter a valid Gujarat pincode."]
        if not v.get("pincode") and "pincode" not in errors:
            errors["pincode"] = ["Enter the 6-digit pincode."]
    if "label" in data or existing is None:
        v["label"] = text("label")[:30] or "Home"
    v["state"] = "Gujarat"
    return v, errors


class AddressList(APIView):
    permission_classes = [IsReOrbitUser]

    def get(self, request):
        rows = SavedAddress.objects.filter(user=request.user.account)
        return ok({"addresses": [address_data(a) for a in rows]})

    def post(self, request):
        user = request.user.account
        if SavedAddress.objects.filter(user=user).count() >= MAX_ADDRESSES:
            return fail(f"You can save up to {MAX_ADDRESSES} addresses.")
        v, errors = _clean_address(request.data)
        if errors:
            return fail("Please fix the highlighted fields.", errors=errors)
        with transaction.atomic():
            first = not SavedAddress.objects.select_for_update().filter(user=user).exists()
            make_default = first or bool(request.data.get("is_default"))
            if make_default:
                SavedAddress.objects.filter(user=user, is_default=True).update(is_default=False)
            a = SavedAddress.objects.create(user=user, is_default=make_default, **v)
        return created({"address": address_data(a)})


class AddressDetail(APIView):
    permission_classes = [IsReOrbitUser]

    def _get(self, request, public_id):
        return get_object_or_404(SavedAddress, public_id=public_id, user=request.user.account)

    def patch(self, request, public_id):
        a = self._get(request, public_id)
        v, errors = _clean_address(request.data, existing=a)
        if errors:
            return fail("Please fix the highlighted fields.", errors=errors)
        for k, val in v.items():
            setattr(a, k, val)
        a.save()
        return ok({"address": address_data(a)})

    def delete(self, request, public_id):
        a = self._get(request, public_id)
        was_default, user = a.is_default, request.user.account
        a.delete()
        if was_default:
            nxt = SavedAddress.objects.filter(user=user).first()
            if nxt:
                nxt.is_default = True
                nxt.save(update_fields=["is_default", "updated_at"])
        return ok(message="Address removed.")


class AddressDefault(APIView):
    permission_classes = [IsReOrbitUser]

    def post(self, request, public_id):
        user = request.user.account
        a = get_object_or_404(SavedAddress, public_id=public_id, user=user)
        with transaction.atomic():
            SavedAddress.objects.filter(user=user, is_default=True).exclude(pk=a.pk).update(is_default=False)
            a.is_default = True
            a.save(update_fields=["is_default", "updated_at"])
        return ok({"address": address_data(a)})


# ------------------------------------------------------------------ checkout
class QuoteView(APIView):
    permission_classes = [IsReOrbitUser]

    def post(self, request):
        try:
            return ok(services.quote(request.user.account, request.data.get("items")))
        except services.CheckoutError as e:
            return _checkout_fail(e)


class CheckoutView(APIView):
    permission_classes = [IsReOrbitUser]

    def post(self, request):
        key = (request.headers.get("Idempotency-Key") or str(request.data.get("request_id") or ""))[:64] or None
        try:
            p = services.create_checkout(request.user.account, request.data, key)
        except services.CheckoutError as e:
            return _checkout_fail(e)
        orders = _order_qs().filter(payment=p)
        body = {
            "payment": {
                "id": p.public_id, "method": p.method, "status": p.status, "amount": p.amount,
                "razorpay_order_id": p.razorpay_order_id, "key_id": gateway.public_config()["key_id"],
                "expires_at": p.expires_at,
            },
            "orders": [order_data(o, request) for o in orders],
        }
        return created(body, message="Order placed." if p.method == Payment.Method.COD else "Complete the payment to confirm.")


# ------------------------------------------------------------------ buyer
def _paged(request, qs, **kw):
    pager = StandardPagination()
    page = pager.paginate_queryset(qs, request)
    return pager.get_paginated_response([order_data(o, request, **kw) for o in page])


class MyOrders(APIView):
    permission_classes = [IsReOrbitUser]

    def get(self, request):
        buyer = request.user.account
        services.expire_stale(buyer)
        qs = _order_qs().filter(buyer=buyer).filter(
            Q(confirmed_at__isnull=False) | Q(status=Order.Status.PENDING_PAYMENT)
        )
        st = request.query_params.get("status")
        if st:
            qs = qs.filter(status=st)
        t = (request.query_params.get("q") or "").strip()
        if t:
            qs = qs.filter(Q(public_id__icontains=t) | Q(lines__title__icontains=t)).distinct()
        return _paged(request, qs)


class MyOrderDetail(APIView):
    permission_classes = [IsReOrbitUser]

    def get(self, request, public_id):
        o = get_object_or_404(_order_qs().prefetch_related("events"), public_id=public_id, buyer=request.user.account)
        return ok({"order": order_data(o, request, events=True)})


class MyOrderCancel(APIView):
    permission_classes = [IsReOrbitUser]

    def post(self, request, public_id):
        o = get_object_or_404(Order, public_id=public_id, buyer=request.user.account)
        try:
            services.cancel_order(o.pk, by="buyer", actor=request.user.account, reason=str(request.data.get("reason") or ""))
        except services.CheckoutError as e:
            return _checkout_fail(e)
        o = _order_qs().prefetch_related("events").get(pk=o.pk)
        return ok({"order": order_data(o, request, events=True)}, message="Order cancelled.")


# ------------------------------------------------------------------ seller + admin
ACTIONS = ("pack", "ship", "deliver", "cancel")


def _counts(qs):
    return {r["status"]: r["n"] for r in qs.order_by().values("status").annotate(n=Count("pk"))}


def _filters(request, qs, admin=False):
    st = request.query_params.get("status")
    if st:
        qs = qs.filter(status=st)
    t = (request.query_params.get("q") or "").strip()
    if t:
        cond = Q(public_id__icontains=t) | Q(lines__title__icontains=t)
        if admin:
            cond |= Q(buyer__email__icontains=t) | Q(buyer__full_name__icontains=t)
        qs = qs.filter(cond).distinct()
    if admin and request.query_params.get("seller_type") in ("user", "remaker", "platform"):
        qs = qs.filter(seller_type=request.query_params["seller_type"])
    return qs


class SalesList(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    @staticmethod
    def scope(request):
        p = request.user
        if p.account_type == "user":
            return Order.objects.filter(seller_user=p.account)
        if p.account_type == "remaker":
            return Order.objects.filter(seller_remaker=p.account)
        return None

    def get(self, request):
        base = self.scope(request)
        if base is None:
            return fail("Only members and ReMakers have sales.", status=403)
        base = base.filter(confirmed_at__isnull=False)
        qs = _filters(request, _order_qs().filter(pk__in=base.values("pk")))
        resp = _paged(request, qs, buyer=True)
        resp.data["data"]["counts"] = _counts(base)
        return resp


class SalesDetail(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def get(self, request, public_id):
        base = SalesList.scope(request)
        if base is None:
            return fail("Only members and ReMakers have sales.", status=403)
        o = get_object_or_404(_order_qs().prefetch_related("events"), public_id=public_id,
                              pk__in=base.filter(confirmed_at__isnull=False).values("pk"))
        return ok({"order": order_data(o, request, events=True, buyer=True)})


def _act(request, order, action, actor_kind):
    d = request.data
    try:
        if action == "cancel":
            services.cancel_order(order.pk, by=actor_kind, actor=request.user.account,
                                  reason=str(d.get("reason") or ""), ip=_ip(request))
        else:
            services.advance_order(order.pk, action, actor_kind=actor_kind, actor=request.user.account,
                                   courier_name=str(d.get("courier_name") or ""),
                                   tracking_no=str(d.get("tracking_no") or ""), ip=_ip(request))
    except services.CheckoutError as e:
        return _checkout_fail(e)
    o = _order_qs().prefetch_related("events").get(pk=order.pk)
    return ok({"order": order_data(o, request, events=True, buyer=True)}, message="Order updated.")


class SalesAction(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def post(self, request, public_id, action):
        if action not in ACTIONS:
            return fail("Unknown action.", status=404)
        base = SalesList.scope(request)
        if base is None:
            return fail("Only members and ReMakers have sales.", status=403)
        o = get_object_or_404(Order, public_id=public_id, pk__in=base.filter(confirmed_at__isnull=False).values("pk"))
        return _act(request, o, action, "seller")


class AdminList(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("orders")]

    def get(self, request):
        base = Order.objects.filter(confirmed_at__isnull=False)
        qs = _filters(request, _order_qs().filter(pk__in=base.values("pk")), admin=True)
        resp = _paged(request, qs, buyer=True)
        resp.data["data"]["counts"] = _counts(base)
        return resp


class AdminDetail(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("orders")]

    def get(self, request, public_id):
        o = get_object_or_404(_order_qs().prefetch_related("events"), public_id=public_id)
        return ok({"order": order_data(o, request, events=True, buyer=True)})


class AdminAction(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("orders")]

    def post(self, request, public_id, action):
        if action not in ACTIONS:
            return fail("Unknown action.", status=404)
        o = get_object_or_404(Order, public_id=public_id)
        return _act(request, o, action, "admin")
