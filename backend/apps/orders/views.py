"""Orders API (mounted at /api/orders/).

Buyer (user account)
  GET/POST addresses/            GET/PATCH/DELETE addresses/<id>/     POST addresses/<id>/default/
  POST quote/                    {items:[{id,qty}]}  -> server prices
  POST checkout/                 {items, address_id, method: RAZORPAY|COD, note}  (header Idempotency-Key)
  GET  me/                       my orders      GET me/<id>/      POST me/<id>/cancel/
  POST me/<id>/return/           (multipart) reason, details, photos     POST me/<id>/return/<escalate|withdraw>/
  GET  options/                  courier list, return and failed-delivery reasons
Seller (user or ReMaker account)
  GET  sales/                    orders to fulfil   GET sales/<id>/
  POST sales/<id>/<pack|ship|deliver|cancel|update|fail|retry|returned>/
  POST sales/<id>/<return-approve|return-reject|return-received>/
Admin (module "orders")
  GET  admin/        GET admin/<id>/        POST admin/<id>/<any seller action>/
  POST admin/<id>/cod-received/  cash from the courier arrived     POST admin/<id>/return-decide/
"""

from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitAuthenticated, IsReOrbitUser
from apps.core import buyers
from apps.core.gujarat import canonical_city
from apps.core.models import SavedAddress
from apps.core.pagination import StandardPagination
from apps.core.responses import created, fail, ok
from apps.core.validators import validate_gujarat_pincode, validate_phone
from apps.payments import gateway
from apps.payments.models import Payment

from . import returns, services
from .models import Order
from .serializers import address_data, order_data

MAX_ADDRESSES = 10


def _ip(request):
    return request.META.get("REMOTE_ADDR")


def _checkout_fail(e):
    return fail(e.message, errors=e.errors, status=e.status, code=e.code)


def _order_qs():
    return (Order.objects
            .select_related("payment", "seller_user", "seller_remaker", "buyer_user", "buyer_remaker", "buyer_admin", "return_request")
            .prefetch_related("lines", "refunds", "return_request__photos"))


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
    permission_classes = [IsReOrbitAuthenticated]

    def get(self, request):
        rows = SavedAddress.objects.filter(**buyers.owner(request.user.account))
        return ok({"addresses": [address_data(a) for a in rows]})

    def post(self, request):
        user = request.user.account
        own = buyers.owner(user)
        if SavedAddress.objects.filter(**own).count() >= MAX_ADDRESSES:
            return fail(f"You can save up to {MAX_ADDRESSES} addresses.")
        v, errors = _clean_address(request.data)
        if errors:
            return fail("Please fix the highlighted fields.", errors=errors)
        with transaction.atomic():
            first = not SavedAddress.objects.select_for_update().filter(**own).exists()
            make_default = first or bool(request.data.get("is_default"))
            if make_default:
                SavedAddress.objects.filter(is_default=True, **own).update(is_default=False)
            a = SavedAddress.objects.create(is_default=make_default, **own, **v)
        return created({"address": address_data(a)})


class AddressDetail(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def _get(self, request, public_id):
        return get_object_or_404(SavedAddress, public_id=public_id, **buyers.owner(request.user.account))

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
            nxt = SavedAddress.objects.filter(**buyers.owner(user)).first()
            if nxt:
                nxt.is_default = True
                nxt.save(update_fields=["is_default", "updated_at"])
        return ok(message="Address removed.")


class AddressDefault(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def post(self, request, public_id):
        user = request.user.account
        own = buyers.owner(user)
        a = get_object_or_404(SavedAddress, public_id=public_id, **own)
        with transaction.atomic():
            SavedAddress.objects.filter(is_default=True, **own).exclude(pk=a.pk).update(is_default=False)
            a.is_default = True
            a.save(update_fields=["is_default", "updated_at"])
        return ok({"address": address_data(a)})


# ------------------------------------------------------------------ checkout
class QuoteView(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def post(self, request):
        try:
            return ok(services.quote(request.user.account, request.data.get("items"),
                                      voucher_code=request.data.get("voucher_code")))
        except services.CheckoutError as e:
            return _checkout_fail(e)


class CheckoutView(APIView):
    permission_classes = [IsReOrbitAuthenticated]

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
    permission_classes = [IsReOrbitAuthenticated]

    def get(self, request):
        buyer = request.user.account
        services.expire_stale(buyer)
        qs = _order_qs().filter(buyer_key=buyers.key_of(buyer)).filter(
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
    permission_classes = [IsReOrbitAuthenticated]

    def get(self, request, public_id):
        o = get_object_or_404(_order_qs().prefetch_related("events"), public_id=public_id, buyer_key=buyers.key_of(request.user.account))
        return ok({"order": order_data(o, request, events=True)})


class MyOrderCancel(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def post(self, request, public_id):
        o = get_object_or_404(Order, public_id=public_id, buyer_key=buyers.key_of(request.user.account))
        try:
            services.cancel_order(o.pk, by="buyer", actor=request.user.account, reason=str(request.data.get("reason") or ""))
        except services.CheckoutError as e:
            return _checkout_fail(e)
        o = _order_qs().prefetch_related("events").get(pk=o.pk)
        return ok({"order": order_data(o, request, events=True)}, message="Order cancelled.")


class MyOrderReturn(APIView):
    """POST: ask for a return (multipart: reason, details, photos)."""
    permission_classes = [IsReOrbitAuthenticated]

    def post(self, request, public_id):
        o = get_object_or_404(Order, public_id=public_id, buyer_key=buyers.key_of(request.user.account))
        try:
            returns.request_return(o.pk, request.user.account, str(request.data.get("reason") or ""),
                                   request.data.get("details"), request.FILES.getlist("photos"))
        except services.CheckoutError as e:
            return _checkout_fail(e)
        o = _order_qs().prefetch_related("events").get(pk=o.pk)
        return created({"order": order_data(o, request, events=True)}, message="Return requested.")


class MyOrderReturnAction(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def post(self, request, public_id, action):
        if action not in ("escalate", "withdraw"):
            return fail("Unknown action.", status=404)
        key = buyers.key_of(request.user.account)
        o = get_object_or_404(Order, public_id=public_id, buyer_key=key)
        rr = getattr(o, "return_request", None)
        if rr is None:
            return fail("There is no return for this order.", status=404)
        try:
            (returns.escalate if action == "escalate" else returns.withdraw)(rr.pk, key)
        except services.CheckoutError as e:
            return _checkout_fail(e)
        o = _order_qs().prefetch_related("events").get(pk=o.pk)
        return ok({"order": order_data(o, request, events=True)}, message="Return updated.")


class OptionsView(APIView):
    """Lists the screens need: couriers, why a return or a failed delivery happens."""
    permission_classes = [IsReOrbitAuthenticated]

    def get(self, request):
        return ok({
            "couriers": list(services.COURIERS),
            "return_days": returns.RETURN_DAYS, "escalate_days": returns.ESCALATE_DAYS, "max_photos": returns.MAX_PHOTOS,
            "return_reasons": [{"code": k, "label": v[0], "fault": v[1]} for k, v in returns.REASONS.items()],
            "fail_reasons": [{"code": k, "label": v[0], "fault": v[1]} for k, v in services.FAIL_REASONS.items()],
        })


# ------------------------------------------------------------------ seller + admin
ACTIONS = ("pack", "ship", "deliver", "cancel", "update", "fail", "retry", "returned",
           "return-approve", "return-reject", "return-received")
ADMIN_ONLY = ("cod-received", "return-decide")


def _counts(qs):
    c = {r["status"]: r["n"] for r in qs.order_by().values("status").annotate(n=Count("pk"))}
    # "needs you" counters for the tabs: returns waiting on someone, cash not yet received from the courier
    c["returns_open"] = qs.filter(return_request__status__in=("Requested", "Approved", "Escalated")).count()
    c["cod_pending"] = (qs.filter(payment__method="COD", status="Delivered", cod_received_at__isnull=True)
                        .exclude(payment_status="Paid").count())
    return c


def _filters(request, qs, admin=False):
    st = request.query_params.get("status")
    if st:
        qs = qs.filter(status=st)
    t = (request.query_params.get("q") or "").strip()
    if t:
        cond = Q(public_id__icontains=t) | Q(lines__title__icontains=t)
        if admin:
            cond |= (Q(buyer_user__email__icontains=t) | Q(buyer_user__full_name__icontains=t)
                     | Q(buyer_remaker__email__icontains=t) | Q(buyer_remaker__full_name__icontains=t)
                     | Q(buyer_admin__email__icontains=t) | Q(buyer_admin__full_name__icontains=t))
        qs = qs.filter(cond).distinct()
    if request.query_params.get("returns") == "open":
        qs = qs.filter(return_request__status__in=("Requested", "Approved", "Escalated"))
    if request.query_params.get("returns") == "any":
        qs = qs.filter(return_request__isnull=False)
    if request.query_params.get("cod") == "pending":
        qs = qs.filter(payment__method="COD", status="Delivered", cod_received_at__isnull=True).exclude(payment_status="Paid")
    if admin and request.query_params.get("item"):  # sales of one product
        qs = qs.filter(lines__ref_id=request.query_params["item"]).distinct()
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
        who, me, ip = actor_kind, request.user.account, _ip(request)
        if who == "admin":
            if order.buyer_type == "admin" and order.buyer_admin_id == me.pk:
                raise services.CheckoutError("You can't handle an order you placed yourself.", code="OWN_ORDER", status=403)
            if action in ("cod-received", "return-received", "return-decide") and not me.has_module("finance", "edit"):
                raise services.CheckoutError("This needs the Payout details (finance) permission.", code="FORBIDDEN", status=403)
        rr = getattr(order, "return_request", None)
        if action == "cancel":
            services.cancel_order(order.pk, by=actor_kind, actor=me, reason=str(d.get("reason") or ""), ip=ip)
        elif action == "update":
            services.post_update(order.pk, d.get("text"), actor_kind=who, actor=me, ip=ip)
        elif action == "fail":
            services.mark_failed(order.pk, str(d.get("reason") or ""), d.get("note"), actor_kind=who, actor=me, ip=ip)
        elif action == "retry":
            services.reattempt(order.pk, actor_kind=who, actor=me, ip=ip)
        elif action == "returned":
            services.return_to_origin(order.pk, actor_kind=who, actor=me, ip=ip)
        elif action == "cod-received":
            services.confirm_cod_cash(order.pk, me, str(d.get("reference") or ""), ip=ip)
        elif action.startswith("return-"):
            if rr is None:
                raise services.CheckoutError("There is no return for this order.", code="NOT_FOUND", status=404)
            if action == "return-received":
                returns.mark_received(rr.pk, actor_kind=who, actor=me, ip=ip)
            elif action == "return-decide":
                returns.admin_decide(rr.pk, bool(d.get("approve")), str(d.get("fault") or ""), d.get("note"), me, ip=ip)
            else:
                returns.seller_decide(rr.pk, action == "return-approve", d.get("note"), actor_kind=who, actor=me, ip=ip)
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
        o = get_object_or_404(_order_qs(), public_id=public_id, pk__in=base.filter(confirmed_at__isnull=False).values("pk"))
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
        if action not in ACTIONS + ADMIN_ONLY:
            return fail("Unknown action.", status=404)
        o = get_object_or_404(_order_qs(), public_id=public_id)
        return _act(request, o, action, "admin")
