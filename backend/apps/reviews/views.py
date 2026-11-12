"""Reviews API (mounted at /api/reviews/).

Buyer (member or ReMaker)
  GET  me/                                   delivered items with the state of their reviews
  POST me/orders/<order>/items/<line>/product/   multipart: rating, title, body, quality, as_described, value,
                                                 packaging, recommend, photos[], remove_photos[]   (create or edit)
  POST me/orders/<order>/seller/             rating, communication, packing, dispatch, as_promised, tags[], body
Seller (member or ReMaker)
  GET  received/                             seller reviews about me
  POST received/<review>/reply/              {reply}
"""

from django.db.models import Q
from rest_framework.views import APIView

from apps.accounts.permissions import IsReOrbitAuthenticated
from apps.core import buyers
from apps.core.pagination import StandardPagination
from apps.core.responses import created, fail, ok
from apps.orders.models import Order, OrderItem

from . import services
from .models import SellerReview
from .serializers import entry_data, product_review_data, seller_review_data


def _err(e):
    return fail(e.message, errors=e.errors, status=e.status, code=e.code)


def _buyer_only(request):
    if buyers.type_of(request.user.account) == "admin":
        return fail("Only members and ReMakers can write reviews.", status=403)
    return None


class MyReviews(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def get(self, request):
        if (denied := _buyer_only(request)):
            return denied
        qs = (OrderItem.objects.filter(order__buyer_key=buyers.key_of(request.user.account), order__status=Order.Status.DELIVERED)
              .select_related("order", "order__seller_user", "order__seller_remaker", "review", "order__seller_review")
              .prefetch_related("review__photos").order_by("-order__delivered_at", "-pk"))
        t = (request.query_params.get("q") or "").strip()
        if t:
            qs = qs.filter(Q(title__icontains=t) | Q(order__public_id__icontains=t))
        rows = [entry_data(ln, request) for ln in qs[:200]]
        counts = {"waiting": sum(not r["complete"] for r in rows), "done": sum(r["complete"] for r in rows)}
        return ok({"results": rows, "counts": counts, "edit_days": services.EDIT_DAYS,
                   "seller_tags": services.SELLER_TAGS, "max_photos": services.MAX_PHOTOS})


class ProductReviewSave(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def post(self, request, order_id, line_id):
        if (denied := _buyer_only(request)):
            return denied
        try:
            r = services.save_product_review(request.user.account, order_id, line_id, request.data,
                                             request.FILES.getlist("photos"), request.data.getlist("remove_photos") if hasattr(request.data, "getlist") else [])
        except services.ReviewError as e:
            return _err(e)
        return created({"review": product_review_data(r, request)}, "Review saved.")


class SellerReviewSave(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def post(self, request, order_id):
        if (denied := _buyer_only(request)):
            return denied
        try:
            r = services.save_seller_review(request.user.account, order_id, request.data)
        except services.ReviewError as e:
            return _err(e)
        return created({"review": seller_review_data(r)}, "Review saved.")


class ReceivedReviews(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def get(self, request):
        a = request.user.account
        t = buyers.type_of(a)
        if t not in ("user", "remaker"):
            return fail("Only members and ReMakers have seller reviews.", status=403)
        qs = SellerReview.objects.filter(seller_type=t, **{f"seller_{t}": a}).select_related("order")
        pager = StandardPagination()
        page = pager.paginate_queryset(qs, request)
        return pager.get_paginated_response([{**seller_review_data(r), "order_id": r.order.public_id} for r in page])


class ReceivedReply(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def post(self, request, review_id):
        try:
            r = services.reply_to_seller_review(request.user.account, review_id, request.data.get("reply"))
        except services.ReviewError as e:
            return _err(e)
        return ok({"review": seller_review_data(r)}, "Reply saved.")
