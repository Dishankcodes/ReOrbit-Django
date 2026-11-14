"""Reviews API (mounted at /api/reviews/).

Buyer (member or ReMaker)
  GET  me/                                   delivered items with the state of their reviews
  POST me/orders/<order>/items/<line>/product/   multipart: rating, title, body, quality, as_described, value,
                                                 packaging, recommend, photos[], remove_photos[]   (create or edit)
  POST me/orders/<order>/seller/             rating, communication, packing, dispatch, as_promised, tags[], body
Seller (member or ReMaker)
  GET    received/                           every visible-or-hidden review I received (product + seller reviews)
  POST   received/<review>/reply/            {reply}   ·   DELETE removes my reply
Anyone signed in as a member or ReMaker
  POST   <review>/report/                    {reason, note}   ·   DELETE withdraws my pending report
Public (no sign-in)
  GET    public/product/<ref>/               reviews of one product (LST-/RPR-/ADI-…) + rating summary
  GET    public/seller/<user|remaker>/<id>/  reviews a member or ReMaker has received + rating summary
ReOrbit team (module "complaints")
  GET    admin/                              ?kind=&status=&reported=1&rating=&q=&seller=&reviewer=&page=
  POST   admin/<review>/hide/   {reason}  ·  POST admin/<review>/restore/
  POST   admin/reports/<report>/resolve/   {action: uphold|dismiss, note}
"""

from itertools import chain

from django.core.paginator import Paginator
from django.db.models import Avg, Count, Q
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitAuthenticated
from apps.core import buyers
from apps.core.responses import created, fail, ok
from apps.orders.models import Order, OrderItem
from apps.users.models import Users
from apps.remakers.models import ReMakers

from . import moderation, services
from .models import ProductReview, ReviewReport, SellerReview
from .serializers import admin_data, entry_data, product_review_data, public_data, received_data, seller_review_data


def _err(e):
    return fail(e.message, errors=e.errors, status=e.status, code=e.code)


def _ip(request):
    return request.META.get("REMOTE_ADDR")


def _buyer_only(request):
    if buyers.type_of(request.user.account) == "admin":
        return fail("Only members and ReMakers can write reviews.", status=403)
    return None


# ------------------------------------------------------------------ buyer side
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


# ------------------------------------------------------------------ seller side
def _received_qs(account):
    t = buyers.type_of(account)
    products = (ProductReview.objects.filter(order__seller_type=t, **{f"order__seller_{t}": account})
                .select_related("order", "order_item", "reviewer_user", "reviewer_remaker").prefetch_related("photos"))
    sellers = (SellerReview.objects.filter(seller_type=t, **{f"seller_{t}": account})
               .select_related("order", "reviewer_user", "reviewer_remaker"))
    return products, sellers


class ReceivedReviews(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def get(self, request):
        a = request.user.account
        if buyers.type_of(a) not in ("user", "remaker"):
            return fail("Only members and ReMakers receive reviews.", status=403)
        products, sellers = _received_qs(a)
        rows = sorted(chain(products[:500], sellers[:500]), key=lambda r: (r.created_at, r.pk), reverse=True)[:500]
        key = buyers.key_of(a)
        mine = {}
        for rep in ReviewReport.objects.filter(reporter_key=key).select_related("product_review", "seller_review"):
            mine[(rep.product_review or rep.seller_review).public_id] = rep
        return ok({"results": [received_data(r, request, mine.get(r.public_id)) for r in rows],
                   "report_reasons": REPORT_REASONS})


REPORT_REASONS = [
    "Abusive or hateful language",
    "Not about my product or service",
    "Contains personal information",
    "Looks fake or paid for",
    "Spam or advertising",
]


class ReceivedReply(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def post(self, request, review_id):
        try:
            r = services.reply_to_review(request.user.account, review_id, request.data.get("reply"))
        except services.ReviewError as e:
            return _err(e)
        return ok({"review": received_data(r, request, moderation.my_report(request.user.account, r))}, "Reply saved.")

    def delete(self, request, review_id):
        try:
            r = services.delete_reply(request.user.account, review_id)
        except services.ReviewError as e:
            return _err(e)
        return ok({"review": received_data(r, request, moderation.my_report(request.user.account, r))}, "Reply removed.")


class ReportReview(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def post(self, request, review_id):
        try:
            rep = moderation.report_review(request.user.account, review_id, request.data.get("reason"), request.data.get("note"))
        except services.ReviewError as e:
            return _err(e)
        from .serializers import report_data
        return created({"report": report_data(rep)}, "Thanks. ReOrbit will take a look.")

    def delete(self, request, review_id):
        try:
            moderation.withdraw_report(request.user.account, review_id)
        except services.ReviewError as e:
            return _err(e)
        return ok({}, "Report withdrawn.")


# ----------------------------------------------------------------------- public
def summary_of(qs_list):
    """Average, count and 1..5 distribution over visible reviews (lists of querysets)."""
    dist = {n: 0 for n in range(1, 6)}
    total = 0
    count = 0
    for qs in qs_list:
        for row in qs.values("rating").annotate(c=Count("pk")):
            dist[row["rating"]] += row["c"]
            total += row["rating"] * row["c"]
            count += row["c"]
    return {"average": round(total / count, 2) if count else 0, "count": count, "distribution": dist}


class _Public(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []


class PublicProductReviews(_Public):
    def get(self, request, ref):
        qs = (ProductReview.objects.filter(order_item__ref_id=ref, status=ProductReview.Status.VISIBLE)
              .select_related("order", "order_item", "reviewer_user", "reviewer_remaker").prefetch_related("photos"))
        return ok({"summary": summary_of([qs]), "results": [public_data(r, request) for r in qs[:50]]})


class PublicSellerReviews(_Public):
    def get(self, request, seller_type, seller_id):
        model = {"user": Users, "remaker": ReMakers}.get(seller_type)
        acct = model.objects.filter(public_id=seller_id).first() if model else None
        if acct is None:
            return fail("We couldn't find that seller.", status=404)
        v = ProductReview.Status.VISIBLE
        products = (ProductReview.objects.filter(order__seller_type=seller_type, status=v, **{f"order__seller_{seller_type}": acct})
                    .select_related("order", "order_item", "reviewer_user", "reviewer_remaker").prefetch_related("photos"))
        sellers = (SellerReview.objects.filter(seller_type=seller_type, status=v, **{f"seller_{seller_type}": acct})
                   .select_related("order", "reviewer_user", "reviewer_remaker"))
        rows = sorted(chain(products[:100], sellers[:100]), key=lambda r: (r.created_at, r.pk), reverse=True)[:50]
        return ok({"summary": summary_of([products, sellers]), "results": [public_data(r, request) for r in rows]})


# ------------------------------------------------------------------------ admin
class _Admin(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("complaints")]


def _admin_row(review, request):
    review = type(review).objects.select_related("order", "reviewer_user", "reviewer_remaker", "hidden_by").prefetch_related("reports").get(pk=review.pk)
    return admin_data(review, request)


class AdminReviews(_Admin):
    def get(self, request):
        q = request.query_params
        kind = q.get("kind")
        prods = ProductReview.objects.select_related("order", "order_item", "reviewer_user", "reviewer_remaker", "hidden_by").prefetch_related("photos", "reports__reporter_user", "reports__reporter_remaker")
        sells = SellerReview.objects.select_related("order", "reviewer_user", "reviewer_remaker", "hidden_by").prefetch_related("reports__reporter_user", "reports__reporter_remaker")
        if q.get("status") in ("Visible", "Hidden"):
            prods, sells = prods.filter(status=q["status"]), sells.filter(status=q["status"])
        if q.get("reported") == "1":
            prods = prods.filter(reports__status="Pending").distinct()
            sells = sells.filter(reports__status="Pending").distinct()
        if q.get("rating", "").isdigit():
            prods, sells = prods.filter(rating=int(q["rating"])), sells.filter(rating=int(q["rating"]))
        if q.get("seller"):
            sid = q["seller"]
            prods = prods.filter(Q(order__seller_user__public_id=sid) | Q(order__seller_remaker__public_id=sid))
            sells = sells.filter(Q(seller_user__public_id=sid) | Q(seller_remaker__public_id=sid))
        if q.get("reviewer"):
            rid = q["reviewer"]
            prods = prods.filter(Q(reviewer_user__public_id=rid) | Q(reviewer_remaker__public_id=rid))
            sells = sells.filter(Q(reviewer_user__public_id=rid) | Q(reviewer_remaker__public_id=rid))
        text = (q.get("q") or "").strip()
        if text:
            prods = prods.filter(Q(title__icontains=text) | Q(body__icontains=text) | Q(order__public_id__icontains=text) | Q(public_id__icontains=text)
                                 | Q(order_item__title__icontains=text) | Q(reviewer_user__full_name__icontains=text) | Q(reviewer_remaker__full_name__icontains=text))
            sells = sells.filter(Q(body__icontains=text) | Q(order__public_id__icontains=text) | Q(public_id__icontains=text)
                                 | Q(reviewer_user__full_name__icontains=text) | Q(reviewer_remaker__full_name__icontains=text))
        if kind == "product":
            sells = sells.none()
        elif kind == "seller":
            prods = prods.none()
        rows = sorted(chain(prods[:1000], sells[:1000]), key=lambda r: (r.created_at, r.pk), reverse=True)
        try:
            size = min(max(int(q.get("page_size", 20)), 1), 100)
        except ValueError:
            size = 20
        paginator = Paginator(rows, size)
        page = paginator.get_page(q.get("page") or 1)
        counts = {
            "all": ProductReview.objects.count() + SellerReview.objects.count(),
            "hidden": ProductReview.objects.filter(status="Hidden").count() + SellerReview.objects.filter(status="Hidden").count(),
            "reported": ProductReview.objects.filter(reports__status="Pending").distinct().count()
                        + SellerReview.objects.filter(reports__status="Pending").distinct().count(),
        }
        return ok({"results": [admin_data(r, request) for r in page], "count": paginator.count, "page": page.number,
                   "page_size": size, "total_pages": paginator.num_pages, "counts": counts})


class AdminHide(_Admin):
    def post(self, request, review_id):
        try:
            r = moderation.hide_review(request.user.account, review_id, request.data.get("reason"), _ip(request))
        except services.ReviewError as e:
            return _err(e)
        return ok({"review": _admin_row(r, request)}, "Review hidden.")


class AdminRestore(_Admin):
    def post(self, request, review_id):
        try:
            r = moderation.restore_review(request.user.account, review_id, _ip(request))
        except services.ReviewError as e:
            return _err(e)
        return ok({"review": _admin_row(r, request)}, "Review restored.")


class AdminResolveReport(_Admin):
    def post(self, request, report_id):
        try:
            r = moderation.resolve_report(request.user.account, report_id, request.data.get("action"), request.data.get("note"), _ip(request))
        except services.ReviewError as e:
            return _err(e)
        return ok({"review": _admin_row(r, request)}, "Report settled.")
