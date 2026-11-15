"""Pickups API (mounted at /api/pickups/). Admin module "pickups".

  GET  admin/requests/                          pickups of listed items: {results, count}
  POST admin/requests/<id>/<schedule|reschedule|pickedUp|complete|cancel|reopen>/
       schedule/reschedule: {date, slot, partner}   cancel: {reason}
  GET  admin/teams/                             pickup teams with their crew (donations OR pickups access)
  POST admin/teams/                             {name, area, vehicle, capacity, note?, lead:{name,phone}, crew?:[{name,phone,role}]}
  PATCH admin/teams/<id>/                       {name?, area, vehicle, capacity, note}
  DELETE admin/teams/<id>/
  POST admin/teams/<id>/status/                 {status: Active|Paused, reason?, move_to?}
  POST admin/teams/<id>/members/                {name, phone, role}
  PATCH admin/teams/<id>/members/<member>/      {name, phone, role, status?}
  DELETE admin/teams/<id>/members/<member>/
  POST admin/teams/<id>/members/<member>/<make-lead|status|move>/   {status} | {to}

Donation pickups are run through /api/donations/admin/ (accept, reschedule, pickedUp ...).
Driver access tokens are issued by /api/donations/admin/partners/.
"""

from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import get_object_or_404
from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin
from apps.core.responses import created, fail, ok
from apps.donations.models import PickupPartner

from . import services
from .serializers import member_data, request_data, request_queryset, team_data

LIST_LIMIT = 1000


def _ip(request):
    return request.META.get("REMOTE_ADDR")


def _fail(e):
    return fail(e.message, errors=e.errors, status=e.status, code=e.code)


def _missing():
    return fail("That could not be found.", status=404, code="NOT_FOUND")


class TeamsAccess(BasePermission):
    """Reading the teams is needed by the Donations screen too (to pick who collects)."""
    message = "You do not have access to this area."

    def has_permission(self, request, view):
        p = request.user
        if not p or getattr(p, "account_type", None) != "admin":
            return False
        if request.method in SAFE_METHODS:
            return p.account.has_module("pickups", "view") or p.account.has_module("donations", "view")
        return p.account.has_module("pickups", "edit")


def _teams():
    return PickupPartner.objects.prefetch_related("members")


def _team(public_id):
    return get_object_or_404(_teams(), public_id=public_id)


class AdminRequests(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("pickups")]

    def get(self, request):
        qs = request_queryset()
        total = qs.count()
        return ok({"results": [request_data(r, request) for r in qs[:LIST_LIMIT]], "count": total})


class AdminRequestAction(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("pickups")]

    def post(self, request, public_id, action):
        try:
            services.run_item_action(public_id, action, request.user.account, request.data, ip=_ip(request))
        except services.PickupError as e:
            return _fail(e)
        return ok(request_data(request_queryset().get(public_id=public_id), request), message="Pickup updated.")


class AdminTeams(APIView):
    permission_classes = [IsReOrbitAdmin, TeamsAccess]

    def get(self, request):
        return ok([team_data(t) for t in _teams()])

    def post(self, request):
        try:
            t = services.create_team(request.user.account, request.data, ip=_ip(request))
        except services.PickupError as e:
            return _fail(e)
        return created(team_data(_teams().get(pk=t.pk)), message="Pickup team added.")


class AdminTeamDetail(APIView):
    permission_classes = [IsReOrbitAdmin, TeamsAccess]

    def get(self, request, public_id):
        return ok(team_data(_team(public_id)))

    def patch(self, request, public_id):
        _team(public_id)
        try:
            t = services.update_team(public_id, request.user.account, request.data, ip=_ip(request))
        except services.PickupError as e:
            return _fail(e)
        return ok(team_data(_teams().get(pk=t.pk)), message="Team updated.")

    def delete(self, request, public_id):
        _team(public_id)
        try:
            services.remove_team(public_id, request.user.account, ip=_ip(request))
        except services.PickupError as e:
            return _fail(e)
        return ok(None, message="Team deleted.")


class AdminTeamStatus(APIView):
    permission_classes = [IsReOrbitAdmin, TeamsAccess]

    def post(self, request, public_id):
        _team(public_id)
        d = request.data
        try:
            t = services.set_team_status(public_id, request.user.account, d.get("status"), d.get("reason", ""),
                                         move_to=d.get("move_to"), ip=_ip(request))
        except services.PickupError as e:
            return _fail(e)
        return ok(team_data(_teams().get(pk=t.pk)), message="Team updated.")


class AdminTeamMembers(APIView):
    permission_classes = [IsReOrbitAdmin, TeamsAccess]

    def post(self, request, public_id):
        _team(public_id)
        try:
            services.add_member(public_id, request.user.account, request.data)
        except services.PickupError as e:
            return _fail(e)
        return created(team_data(_teams().get(public_id=public_id)), message="Member added.")


def _member_pk(raw):
    try:
        return int(str(raw).replace("PM-", ""))
    except ValueError:
        return None


class AdminTeamMember(APIView):
    permission_classes = [IsReOrbitAdmin, TeamsAccess]

    def patch(self, request, public_id, member):
        pk = _member_pk(member)
        try:
            services.update_member(public_id, pk, request.user.account, request.data)
        except ObjectDoesNotExist:
            return _missing()
        except services.PickupError as e:
            return _fail(e)
        return ok(team_data(_teams().get(public_id=public_id)), message="Member updated.")

    def delete(self, request, public_id, member):
        try:
            services.remove_member(public_id, _member_pk(member), request.user.account)
        except ObjectDoesNotExist:
            return _missing()
        except services.PickupError as e:
            return _fail(e)
        return ok(team_data(_teams().get(public_id=public_id)), message="Member removed.")


class AdminTeamMemberAction(APIView):
    permission_classes = [IsReOrbitAdmin, TeamsAccess]

    def post(self, request, public_id, member, action):
        pk, admin, d = _member_pk(member), request.user.account, request.data
        try:
            if action == "make-lead":
                services.make_lead(public_id, pk, admin)
            elif action == "status":
                services.set_member_status(public_id, pk, admin, d.get("status"))
            elif action == "move":
                services.move_member(public_id, pk, admin, d.get("to"))
            else:
                return fail("Unknown action.", status=404)
        except ObjectDoesNotExist:
            return _missing()
        except services.PickupError as e:
            return _fail(e)
        return ok(team_data(_teams().get(public_id=public_id)), message="Member updated.")
