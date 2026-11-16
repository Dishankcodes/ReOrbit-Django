"""Complaints API (mounted at /api/complaints/).

Members and ReMakers (signed in):
  POST me/        {type: User|ReMaker|Product, target_id, category, description}   -> {id}

Admin (module "complaints"):
  GET  admin/                       every complaint with its target, history, notes and warnings: {results, count}
  GET  admin/targets/               what can be reported, for the "Log a complaint" form: {User:[{id,label}], ...}
  POST admin/                       log one by hand: {type, targetId, category, description, reporterName?, reporterRole?}
  POST admin/<id>/<start|assign|dismiss|warn|suspend|block|removeProduct|removeReview|reopen>/
       {reason?, message?, assigneeId?, alsoResolve?}
  POST admin/<id>/notes/            {text}
"""

from rest_framework.permissions import BasePermission
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitAuthenticated
from apps.admins.models import AdminItem
from apps.core.responses import created, fail, ok
from apps.listings.models import Item
from apps.remakers.models import RemakerProduct, ReMakers
from apps.reviews.models import ProductReview, SellerReview
from apps.users.models import Users

from . import services
from .serializers import complaint_data, queryset, warnings_by_target

LIST_LIMIT = 1000
TARGET_LIMIT = 500


def _fail(e):
    return fail(e.message, errors=e.errors, status=e.status, code=e.code)


def _ip(request):
    return request.META.get("REMOTE_ADDR")


class IsMember(BasePermission):
    """A signed-in member or ReMaker (never an admin)."""
    message = "Only members and ReMakers can report."

    def has_permission(self, request, view):
        return getattr(request.user, "account_type", None) in ("user", "remaker")


class MyReport(APIView):
    permission_classes = [IsReOrbitAuthenticated, IsMember]

    def post(self, request):
        try:
            c = services.file_member(request.user.account, request.data)
        except services.ComplaintError as e:
            return _fail(e)
        return created({"id": c.public_id}, message="Thanks, we got your report.")


def _one(request, public_id):
    c = queryset().get(public_id=public_id)
    return complaint_data(c, request, warnings_by_target().get(f"{c.target_type}:{services.target_row(c).public_id}", []))


class AdminComplaints(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("complaints")]

    def get(self, request):
        qs = queryset()
        total = qs.count()
        warnings = warnings_by_target()
        rows = []
        for c in qs[:LIST_LIMIT]:
            rows.append(complaint_data(c, request, warnings.get(f"{c.target_type}:{services.target_row(c).public_id}", [])))
        return ok({"results": rows, "count": total})

    def post(self, request):
        try:
            c = services.log_by_admin(request.user.account, request.data, ip=_ip(request))
        except services.ComplaintError as e:
            return _fail(e)
        return created(_one(request, c.public_id), message="Complaint logged.")


class AdminAction(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("complaints")]

    def post(self, request, public_id, action):
        try:
            services.run_action(public_id, action, request.user.account, request.data, ip=_ip(request))
        except services.ComplaintError as e:
            return _fail(e)
        return ok(_one(request, public_id), message="Complaint updated.")


class AdminNotes(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("complaints")]

    def post(self, request, public_id):
        try:
            services.add_note(public_id, request.user.account, request.data.get("text"))
        except services.ComplaintError as e:
            return _fail(e)
        return created(_one(request, public_id), message="Note added.")


class AdminTargets(APIView):
    """Things the team can pick in the "Log a complaint" form (newest first, capped)."""
    permission_classes = [IsReOrbitAdmin, HasAdminModule("complaints")]

    def get(self, request):
        users = Users.objects.exclude(status="Deleted").select_related("profile").order_by("-created_at")[:TARGET_LIMIT]
        makers = ReMakers.objects.exclude(status="Deleted").select_related("profile").order_by("-created_at")[:TARGET_LIMIT]
        items = Item.objects.filter(item_status__in=("Listed", "Reserved")).select_related("user").order_by("-created_at")[:TARGET_LIMIT]
        rprods = RemakerProduct.objects.filter(status__in=("Listed", "Sold_Out")).select_related("remaker").order_by("-created_at")[:TARGET_LIMIT]
        aitems = AdminItem.objects.filter(status__in=("Listed", "Sold_Out")).order_by("-created_at")[:TARGET_LIMIT]
        pr = ProductReview.objects.filter(status="Visible").select_related("reviewer_user", "reviewer_remaker", "reviewer_admin", "order_item").order_by("-created_at")[:TARGET_LIMIT]
        sr = SellerReview.objects.filter(status="Visible").select_related("reviewer_user", "reviewer_remaker", "reviewer_admin").order_by("-created_at")[:TARGET_LIMIT]

        def who(r):
            a = r.reviewer_user or r.reviewer_remaker or r.reviewer_admin
            return a.full_name

        products = (
            [{"id": i.public_id, "label": f"{i.title} · {i.user.full_name}"} for i in items]
            + [{"id": p.public_id, "label": f"{p.title} · {p.remaker.full_name}"} for p in rprods]
            + [{"id": a.public_id, "label": f"{a.title} · ReOrbit store"} for a in aitems]
        )
        reviews = (
            [{"id": r.public_id, "label": f"{who(r)} on {r.order_item.title} ({r.rating}★)"} for r in pr]
            + [{"id": r.public_id, "label": f"{who(r)} · seller review ({r.rating}★)"} for r in sr]
        )
        return ok({
            "User": [{"id": u.public_id, "label": f"{u.full_name} · {getattr(u.profile, 'city', '') or u.email}"} for u in users],
            "ReMaker": [{"id": m.public_id, "label": f"{m.full_name} · @{m.username}"} for m in makers],
            "Product": products, "Review": reviews,
        })
