"""Donations API (mounted at /api/donations/).

Member (user)
  GET  me/                 my donations (newest first)
  POST me/                 donate: multipart with images + fields (see services.create)
  GET  me/<id>/            one donation
  POST me/<id>/cancel/     {reason}
  POST me/<id>/reschedule/ {date, slot, reason?}
  POST me/<id>/note/       {note}
Admin (module "donations")
  GET  admin/              every donation (?status= &q=), newest first, with counts
  GET  admin/<id>/         one donation
  POST admin/<id>/action/  {action: accept|reject|reschedule|cancelPickup|pickedUp|received|complete|reopen,
                            date, slot, partner, reason, ngo}
"""

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitUser
from apps.core.responses import created, fail, ok

from . import services
from .models import Donation
from .serializers import admin_data, member_data

ADMIN_LIST_LIMIT = 1000


def _err(e):
    return fail(e.message, errors=e.errors, status=e.status, code=e.code)


def _qs():
    return Donation.objects.select_related("user").prefetch_related("photos", "events")


class MyDonations(APIView):
    permission_classes = [IsReOrbitUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        rows = _qs().filter(user=request.user.account)
        return ok({"donations": [member_data(d, request) for d in rows]})

    def post(self, request):
        try:
            d = services.create(request.user.account, request.data, request.FILES.getlist("images"))
        except services.DonationError as e:
            return _err(e)
        return created({"donation": member_data(_qs().get(pk=d.pk), request)}, "Donation submitted.")


class _Mine(APIView):
    permission_classes = [IsReOrbitUser]

    def reply(self, request, public_id, message="OK"):
        d = get_object_or_404(_qs(), public_id=public_id, user=request.user.account)
        return ok({"donation": member_data(d, request)}, message)


class MyDonation(_Mine):
    def get(self, request, public_id):
        return self.reply(request, public_id)


class MyCancel(_Mine):
    def post(self, request, public_id):
        try:
            services.cancel(request.user.account, public_id, request.data.get("reason"))
        except Donation.DoesNotExist:
            return fail("Donation not found.", status=404)
        except services.DonationError as e:
            return _err(e)
        return self.reply(request, public_id, "Donation cancelled.")


class MyReschedule(_Mine):
    def post(self, request, public_id):
        try:
            services.reschedule(request.user.account, public_id, request.data)
        except Donation.DoesNotExist:
            return fail("Donation not found.", status=404)
        except services.DonationError as e:
            return _err(e)
        return self.reply(request, public_id, "Pickup rescheduled.")


class MyNote(_Mine):
    def post(self, request, public_id):
        try:
            services.set_note(request.user.account, public_id, request.data.get("note"))
        except Donation.DoesNotExist:
            return fail("Donation not found.", status=404)
        except services.DonationError as e:
            return _err(e)
        return self.reply(request, public_id, "Note saved.")


class _AdminView(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("donations")]


class AdminDonations(_AdminView):
    def get(self, request):
        qs = _qs()
        st = request.query_params.get("status")
        if st in Donation.Status.values:
            qs = qs.filter(status=st)
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(public_id__icontains=q) | Q(title__icontains=q) | Q(user__full_name__icontains=q)
                           | Q(user__email__icontains=q))
        rows = list(qs[:ADMIN_LIST_LIMIT])
        counts = {r["status"]: r["n"] for r in Donation.objects.order_by().values("status").annotate(n=Count("pk"))}
        return ok({"results": [admin_data(d, request) for d in rows], "count": len(rows), "counts": counts})


class AdminDonation(_AdminView):
    def get(self, request, public_id):
        return ok({"donation": admin_data(get_object_or_404(_qs(), public_id=public_id), request)})


class AdminDonationAction(_AdminView):
    def post(self, request, public_id):
        try:
            d = services.admin_action(public_id, str(request.data.get("action") or ""), request.user.account,
                                      request.data, ip=request.META.get("REMOTE_ADDR"))
        except services.DonationError as e:
            return _err(e)
        return ok({"donation": admin_data(_qs().get(pk=d.pk), request)}, "Donation updated.")
