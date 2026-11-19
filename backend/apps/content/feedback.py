"""Testimonials: members and ReMakers rate ReOrbit, the team picks which ones the Home pages show.

GET  /api/content/feedback/mine/          the signed-in member's or ReMaker's own rating (or null)
POST /api/content/feedback/               {rating 1-5, message}  create or update it (goes back to review)
GET  /api/public/testimonials/?side=user|remaker   up to 3 shown on that Home page (no login)
GET  /api/content/admin/feedback/         ?status=New|Shown|Hidden&q=   (Content view access)
POST /api/content/admin/feedback/<PFB-id>/  {action: show|hide|move, surface?, direction?}  (Content edit)

A Home page shows at most PlatformFeedback.MAX_SHOWN testimonials. Showing one more than that is refused,
so the team decides which one to take down first.
"""

import time

from django.core.cache import cache, caches
from django.db import transaction
from django.db.models import Max, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitAuthenticated
from apps.core import buyers
from apps.core.responses import fail, ok
from apps.core.services import audit, notify

from .models import PlatformFeedback

F = PlatformFeedback
CACHE_VER = "public_testimonials_ver"


def _photo(request, profile):
    if profile is None or not getattr(profile, "profile_image", None):
        return None
    try:
        return request.build_absolute_uri(profile.profile_image.url)
    except ValueError:
        return None


def _author(f):
    return f.user if f.author_type == "user" else f.remaker


def _role(f):
    a = _author(f)
    p = getattr(a, "profile", None)
    city = (getattr(p, "city", "") or "").strip() if p else ""
    who = "ReMaker" if f.author_type == "remaker" else "Member"
    return f"{who} · {city}" if city else who


def public_row(f, request):
    a = _author(f)
    return {
        "id": f.public_id, "name": a.full_name, "role": _role(f), "rating": f.rating, "text": f.message,
        "image": _photo(request, getattr(a, "profile", None)), "side": f.author_type,
    }


def admin_row(f, request):
    a = _author(f)
    return {
        **public_row(f, request),
        "status": f.status, "surface": f.surface, "position": f.position,
        "author": {"type": f.author_type, "id": a.public_id, "email": a.email, "status": a.status,
                   "path": f"/admin-{'remakers' if f.author_type == 'remaker' else 'users'}/{a.public_id}"},
        "created_at": f.created_at, "updated_at": f.updated_at,
        "reviewed_by": f.reviewed_by.full_name if f.reviewed_by_id else None, "reviewed_at": f.reviewed_at,
    }


def _bump():
    caches["shared"].set(CACHE_VER, int(time.time() * 1000), None)  # every worker sees it (see spotlight._versions)


def _owner(account):
    kind = buyers.type_of(account)
    return kind, ({"user": account} if kind == "user" else {"remaker": account})


class MyFeedback(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def _account(self, request):
        a = request.user.account
        return a if buyers.type_of(a) in ("user", "remaker") else None

    def get(self, request):
        a = self._account(request)
        if a is None:
            return fail("Only members and ReMakers rate ReOrbit.", status=403)
        kind, owner = _owner(a)
        f = F.objects.filter(**owner).first()
        return ok({"feedback": None if f is None else {
            "id": f.public_id, "rating": f.rating, "message": f.message, "status": f.status,
            "shown": f.status == F.Status.SHOWN, "updated_at": f.updated_at}})

    def post(self, request):
        a = self._account(request)
        if a is None:
            return fail("Only members and ReMakers rate ReOrbit.", status=403)
        try:
            rating = int(request.data.get("rating"))
        except (TypeError, ValueError):
            rating = 0
        message = " ".join(str(request.data.get("message") or "").split())[:400]
        errors = {}
        if not 1 <= rating <= 5:
            errors["rating"] = ["Choose 1 to 5 stars."]
        if len(message) < 10:
            errors["message"] = ["Tell us a little more (at least 10 characters)."]
        if errors:
            return fail("Please fix the highlighted fields.", errors=errors)
        kind, owner = _owner(a)
        with transaction.atomic():
            f = F.objects.select_for_update().filter(**owner).first()
            was_shown = bool(f and f.status == F.Status.SHOWN)
            if f is None:
                f = F(author_type=kind, **owner)
            f.rating, f.message = rating, message
            # an edited rating is checked again before it can be on the Home page
            f.status, f.surface, f.position = F.Status.NEW, "", 0
            f.save()
        if was_shown:
            _bump()
        return ok({"feedback": {"id": f.public_id, "rating": f.rating, "message": f.message, "status": f.status,
                                "shown": False, "updated_at": f.updated_at}},
                  message="Thank you for rating ReOrbit!")


class PublicTestimonials(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        side = "remaker" if request.query_params.get("side") == "remaker" else "user"
        key = f"public_testimonials:{caches['shared'].get(CACHE_VER, 0)}:{side}:{request.get_host()}"
        data = cache.get(key)
        if data is None:
            rows = (F.objects.filter(status=F.Status.SHOWN, surface=side)
                    .select_related("user__profile", "remaker__profile").order_by("position", "-pk")[:F.MAX_SHOWN])
            data = {"testimonials": [public_row(f, request) for f in rows]}
            cache.set(key, data, 300)
        return ok(data)


class AdminFeedbackList(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("content")]

    def get(self, request):
        qs = F.objects.select_related("user__profile", "remaker__profile", "reviewed_by")
        counts = {s: qs.filter(status=s).count() for s in F.Status.values}
        shown = {s: qs.filter(status=F.Status.SHOWN, surface=s).count() for s in F.SURFACES}
        st = request.query_params.get("status")
        if st in F.Status.values:
            qs = qs.filter(status=st)
        side = request.query_params.get("side")
        if side in F.SURFACES:
            qs = qs.filter(author_type=side)
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(public_id__iexact=q) | Q(message__icontains=q) | Q(user__full_name__icontains=q)
                           | Q(remaker__full_name__icontains=q) | Q(user__email__icontains=q)
                           | Q(remaker__email__icontains=q))
        if st == F.Status.SHOWN:
            qs = qs.order_by("surface", "position")
        rows = list(qs[:300])
        ratings = [f.rating for f in F.objects.only("rating")]
        return ok({
            "results": [admin_row(f, request) for f in rows], "counts": counts, "shown": shown,
            "max_shown": F.MAX_SHOWN,
            "average": round(sum(ratings) / len(ratings), 1) if ratings else 0, "total": len(ratings),
        })


class AdminFeedbackDetail(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("content", "edit")]

    def post(self, request, public_id):
        action = str(request.data.get("action") or "")
        admin = request.user.account
        with transaction.atomic():
            f = get_object_or_404(F.objects.select_for_update(), public_id=public_id)
            if action == "show":
                surface = str(request.data.get("surface") or f.author_type)
                if surface not in F.SURFACES:
                    return fail("Choose which Home page.", errors={"surface": ["Use user or remaker."]})
                if not (f.status == F.Status.SHOWN and f.surface == surface):
                    on = F.objects.filter(status=F.Status.SHOWN, surface=surface).exclude(pk=f.pk)
                    if on.count() >= F.MAX_SHOWN:
                        where = "ReMaker Home" if surface == "remaker" else "member Home"
                        return fail(f"The {where} already shows {F.MAX_SHOWN}. Take one down first.",
                                    code="LIMIT", status=409)
                    f.position = (on.aggregate(m=Max("position"))["m"] or 0) + 1
                f.status, f.surface = F.Status.SHOWN, surface
                msg = "Shown on the Home page."
            elif action == "hide":
                f.status, f.surface, f.position = F.Status.HIDDEN, "", 0
                msg = "Taken off the Home page."
            elif action == "move":
                if f.status != F.Status.SHOWN:
                    return fail("Only a shown testimonial can be moved.", code="BAD_STATE", status=409)
                rows = list(F.objects.select_for_update().filter(status=F.Status.SHOWN, surface=f.surface)
                            .order_by("position", "pk"))
                i = next(n for n, r in enumerate(rows) if r.pk == f.pk)
                j = i - 1 if request.data.get("direction") == "up" else i + 1
                if 0 <= j < len(rows):
                    rows[i], rows[j] = rows[j], rows[i]
                for n, r in enumerate(rows, start=1):
                    if r.position != n:
                        F.objects.filter(pk=r.pk).update(position=n)
                f.refresh_from_db()
                msg = "Order changed."
            else:
                return fail("Unknown action.", errors={"action": ["Use show, hide or move."]})
            f.reviewed_by, f.reviewed_at = admin, timezone.now()
            f.save()
        _bump()
        if action == "show":
            try:
                notify(_author(f), "Your rating is on ReOrbit",
                       "Thanks! The team picked your words to show on the ReOrbit Home page.", module="help")
            except Exception:  # noqa: BLE001  a notification never stops the change
                pass
        audit(admin, f"testimonial.{action}", "platform_feedback", f.public_id)
        f = F.objects.select_related("user__profile", "remaker__profile", "reviewed_by").get(pk=f.pk)
        return ok({"item": admin_row(f, request)}, message=msg)
