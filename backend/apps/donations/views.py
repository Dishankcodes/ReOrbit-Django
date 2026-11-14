"""Donations API (mounted at /api/donations/).

Member
  GET  me/                      my donations
  POST me/                      (multipart) title, category, description, condition, quantity, images,
                                address_id, contact_name, phone, date, slot, note
  GET  me/<id>/                 one donation
  POST me/<id>/cancel/          {reason}
  POST me/<id>/reschedule/      {date, slot, reason}
  POST me/<id>/note/            {note}
  GET  me/<id>/certificate/     the certificate PDF, once the donation is Completed

Admin (module "donations")
  GET  admin/                   every donation: {results, count}   (?status=Pending&q=text)
  GET  admin/<id>/
  POST admin/<id>/<accept|reject|reschedule|cancelPickup|pickedUp|failed|received|complete|reopen>/
       accept: {date, slot, partner, accepted_quantity?, partial_reason?}  — partner by public_id or name
       pickedUp: {code}  — must match the donor's handover code
       failed: {reason}
       received: {received_quantity?, received_condition?, note?}
  GET  admin/partners/          pickup partners, with their tokens
  POST admin/partners/          {name, phone?}  -> creates one and returns its token

Pickup partner (no ReOrbit account — header "X-Partner-Token: <token>", issued above)
  GET  partner/pickups/                 the partner's scheduled/failed pickups
  POST partner/pickups/<id>/collect/    {code}  — the donor's handover code
  POST partner/pickups/<id>/failed/     {reason}
"""

from django.db.models import Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitUser
from apps.core.responses import created, fail, ok

from . import services
from .models import Donation, PickupPartner
from .serializers import (admin_donation_data, donation_data, partner_pickup_data,
                           pickup_partner_data)

ADMIN_LIST_LIMIT = 500  # the admin screen loads the list once; newest first


def _ip(request):
    return request.META.get("REMOTE_ADDR")


def _qs():
    return (Donation.objects.select_related("donor", "donor__profile", "reward_voucher", "assigned_partner")
            .prefetch_related("images", "events"))


def _fail(e):
    return fail(e.message, errors=e.errors, status=e.status, code=e.code)


# ------------------------------------------------------------------ member
class MyDonations(APIView):
    permission_classes = [IsReOrbitUser]

    def get(self, request):
        rows = _qs().filter(donor=request.user.account)
        return ok([donation_data(d, request) for d in rows])

    def post(self, request):
        try:
            d = services.create_donation(request.user.account, request.data, request.FILES.getlist("images"))
        except services.DonationError as e:
            return _fail(e)
        return created(donation_data(_qs().get(pk=d.pk), request), message="Donation submitted.")


class MyDonationDetail(APIView):
    permission_classes = [IsReOrbitUser]

    def get(self, request, public_id):
        d = get_object_or_404(_qs(), public_id=public_id, donor=request.user.account)
        return ok(donation_data(d, request))


class MyDonationAction(APIView):
    permission_classes = [IsReOrbitUser]

    def post(self, request, public_id, action):
        if action not in ("cancel", "reschedule", "note"):
            return fail("Unknown action.", status=404)
        donor = request.user.account
        d = get_object_or_404(Donation, public_id=public_id, donor=donor)
        data = request.data
        try:
            if action == "cancel":
                services.cancel_by_donor(d.pk, donor, data.get("reason"))
            elif action == "reschedule":
                services.reschedule_by_donor(d.pk, donor, data.get("date"), data.get("slot"), data.get("reason"))
            else:
                services.update_note(d.pk, donor, data.get("note"))
        except services.DonationError as e:
            return _fail(e)
        return ok(donation_data(_qs().get(pk=d.pk), request), message="Donation updated.")


class MyDonationCertificate(APIView):
    permission_classes = [IsReOrbitUser]

    def get(self, request, public_id):
        d = get_object_or_404(Donation, public_id=public_id, donor=request.user.account)
        if not d.certificate_file:
            return fail("The certificate isn't ready yet.", status=404, code="NOT_READY")
        return FileResponse(d.certificate_file.open("rb"), content_type="application/pdf",
                            as_attachment=True, filename=f"{d.certificate_id}.pdf")


# ------------------------------------------------------------------ admin
class AdminDonations(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("donations")]

    def get(self, request):
        qs = _qs()
        st = request.query_params.get("status")
        if st in Donation.Status.values:
            qs = qs.filter(status=st)
        t = (request.query_params.get("q") or "").strip()
        if t:
            qs = qs.filter(Q(public_id__icontains=t) | Q(title__icontains=t) | Q(donor__full_name__icontains=t)
                           | Q(donor__email__icontains=t))
        total = qs.count()
        rows = [admin_donation_data(d, request) for d in qs[:ADMIN_LIST_LIMIT]]
        return ok({"results": rows, "count": total})


class AdminDonationDetail(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("donations")]

    def get(self, request, public_id):
        return ok(admin_donation_data(get_object_or_404(_qs(), public_id=public_id), request))


class AdminDonationAction(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("donations")]

    def post(self, request, public_id, action):
        d = get_object_or_404(Donation, public_id=public_id)
        try:
            services.run_action(d.pk, action, request.user.account, request.data, ip=_ip(request))
        except services.DonationError as e:
            return _fail(e)
        return ok(admin_donation_data(_qs().get(pk=d.pk), request), message="Donation updated.")


class AdminPickupPartners(APIView):
    """Pickup partners have no ReOrbit login: admin hands their token to the driver directly."""
    permission_classes = [IsReOrbitAdmin, HasAdminModule("donations")]

    def get(self, request):
        rows = PickupPartner.objects.all()
        return ok([{**pickup_partner_data(p), "token": p.token} for p in rows])

    def post(self, request):
        name = " ".join(str(request.data.get("name") or "").split())[:60]
        if len(name) < 2:
            return fail("Give the partner a name.", errors={"name": ["Give the partner a name."]})
        if PickupPartner.objects.filter(name__iexact=name).exists():
            return fail("A partner with this name already exists.", errors={"name": ["Already in use."]})
        phone = " ".join(str(request.data.get("phone") or "").split())[:20]
        lead_name = " ".join(str(request.data.get("lead_name") or "").split())[:120]
        p = PickupPartner.objects.create(name=name, phone=phone, lead_name=lead_name)
        return created({**pickup_partner_data(p), "token": p.token}, message="Pickup partner added.")


# ------------------------------------------------------------------ pickup partner
def _partner_or_fail(request):
    return services.partner_for_token(request.headers.get("X-Partner-Token"))


class PartnerPickups(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            partner = _partner_or_fail(request)
        except services.DonationError as e:
            return _fail(e)
        return ok([partner_pickup_data(d) for d in services.partner_pickups(partner)])


class PartnerPickupAction(APIView):
    permission_classes = [AllowAny]

    def post(self, request, public_id, action):
        try:
            partner = _partner_or_fail(request)
        except services.DonationError as e:
            return _fail(e)
        d = get_object_or_404(Donation, public_id=public_id)
        try:
            if action == "collect":
                services.partner_collect(d.pk, partner, request.data.get("code"))
            elif action == "failed":
                services.partner_mark_failed(d.pk, partner, request.data.get("reason"))
            else:
                return fail("Unknown action.", status=404)
        except services.DonationError as e:
            return _fail(e)
        return ok(partner_pickup_data(Donation.objects.get(pk=d.pk)), message="Updated.")
