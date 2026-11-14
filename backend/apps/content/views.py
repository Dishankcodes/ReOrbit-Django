"""Admin: banners, FAQs and policies. Needs the "content" module.

  GET/POST          /api/content/admin/banners/              list / create (always a draft)
  PATCH/DELETE      /api/content/admin/banners/<id>/         edit, publish (active), delete
  POST              /api/content/admin/banners/<id>/duplicate/   ·   .../move/ {dir: -1|1}
  GET/POST          /api/content/admin/faqs/                 PATCH/DELETE .../faqs/<id>/   POST .../move/
  GET               /api/content/admin/policies/             every policy with its draft and versions
  POST/DELETE       /api/content/admin/policies/<key>/draft/        save / discard the draft
  POST              /api/content/admin/policies/<key>/publish/     {body, note, major}
  POST              /api/content/admin/policies/<key>/restore/      {version}
  GET               /api/content/admin/log/                  the latest changes
"""

from datetime import date, timedelta

from django.db import transaction
from django.db.models import F, Max
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin
from apps.core.responses import created, fail, ok
from apps.core.services import audit

from .models import Banner, ContentLog, Faq, Policy, PolicyVersion


class _Admin(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("content")]

    @staticmethod
    def who(request):
        return request.user.account.full_name or "Admin"

    def log(self, request, text):
        ContentLog.objects.create(by_name=self.who(request), text=text[:300])
        stale = ContentLog.objects.order_by("-created_at", "-id").values_list("id", flat=True)[200:]
        ContentLog.objects.filter(id__in=list(stale)).delete()

    def audit(self, request, action, kind, ref, **kw):
        audit(request.user.account, action, kind, ref, ip=request.META.get("REMOTE_ADDR"), **kw)


def _text(data, key):
    return " ".join(str(data.get(key) or "").split())


# --------------------------------------------------------------------------- #
# banners
# --------------------------------------------------------------------------- #
def banner_status(b, today):
    if not b.active:
        return "Draft"
    if b.start and b.start > today:
        return "Scheduled"
    if b.end and b.end < today:
        return "Ended"
    return "Live"


def banner_row(b, today=None):
    today = today or timezone.localdate()
    return {
        "id": b.public_id, "title": b.title, "subtitle": b.subtitle, "cta": b.cta, "link": b.link,
        "placement": b.placement, "audience": b.audience, "image": b.image,
        "start": b.start.isoformat() if b.start else "", "end": b.end.isoformat() if b.end else "",
        "active": b.active, "status": banner_status(b, today), "views": b.views, "clicks": b.clicks,
        "ctr": (b.clicks / b.views * 100) if b.views else 0,
        "startsIn": (b.start - today).days if b.start else 0,
        "endsIn": (b.end - today).days if b.end else None,
        "createdAt": b.created_at,
    }


def _date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return False


def clean_banner(data):
    errs, out = {}, {}
    title = _text(data, "title")
    if len(title) < 4:
        errs["title"] = ["Write a headline of at least 4 letters."]
    elif len(title) > 60:
        errs["title"] = ["Keep the headline under 60 characters."]
    out["title"] = title
    out["subtitle"] = _text(data, "subtitle")
    if len(out["subtitle"]) > 110:
        errs["subtitle"] = ["Keep the line under 110 characters."]
    out["cta"] = _text(data, "cta")
    if len(out["cta"]) > 20:
        errs["cta"] = ["Keep the button text under 20 characters."]
    link = str(data.get("link") or "").strip()
    if not (link.startswith("/") or link.startswith("https://") or link.startswith("http://")) or len(link) > 300:
        errs["link"] = ["Start the link with / (inside ReOrbit) or https://."]
    out["link"] = link
    if data.get("placement") not in Banner.PLACEMENTS:
        errs["placement"] = ["Choose where the banner shows."]
    out["placement"] = data.get("placement")
    if data.get("audience") not in Banner.AUDIENCES:
        errs["audience"] = ["Choose who sees the banner."]
    out["audience"] = data.get("audience")
    image = str(data.get("image") or "").strip()
    if not (image.startswith("https://") or image.startswith("/")) or len(image) > 500:
        errs["image"] = ["Choose a picture for the banner."]
    out["image"] = image
    start, end = _date(data.get("start")), _date(data.get("end"))
    if start is False or end is False:
        errs["start"] = ["Use a valid date."]
    elif start and end and end < start:
        errs["end"] = ["The end date must be after the start date."]
    out["start"], out["end"] = start or None, end or None
    return out, errs


def _next_banner_position(placement):
    return (Banner.objects.filter(placement=placement).aggregate(m=Max("position"))["m"] or 0) + 1


class AdminBanners(_Admin):
    def get(self, request):
        today = timezone.localdate()
        return ok({"results": [banner_row(b, today) for b in Banner.objects.all()]})

    def post(self, request):
        out, errs = clean_banner(request.data)
        if errs:
            return fail("Please fix the highlighted fields.", errors=errs, status=400)
        with transaction.atomic():
            b = Banner.objects.create(active=False, position=_next_banner_position(out["placement"]),
                                      created_by=request.user.account, **out)
            self.log(request, f"Created the banner “{b.title}” as a draft")
            self.audit(request, "banner.create", "banner", b.public_id, after={"title": b.title})
        return created({"banner": banner_row(b)}, message="Banner created.")


class AdminBannerDetail(_Admin):
    def patch(self, request, public_id):
        with transaction.atomic():
            b = get_object_or_404(Banner.objects.select_for_update(), public_id=public_id)
            if set(request.data.keys()) <= {"active"}:  # publish / unpublish
                if not isinstance(request.data.get("active"), bool):
                    return fail("Say whether the banner is published.", status=400)
                b.active = request.data["active"]
                b.save(update_fields=["active", "updated_at"])
                self.log(request, f"{'Published' if b.active else 'Unpublished'} the banner “{b.title}”")
                self.audit(request, "banner.publish" if b.active else "banner.unpublish", "banner", b.public_id)
            else:
                out, errs = clean_banner({**banner_row(b), **request.data})
                if errs:
                    return fail("Please fix the highlighted fields.", errors=errs, status=400)
                if out["placement"] != b.placement:
                    out["position"] = _next_banner_position(out["placement"])
                for k, v in out.items():
                    setattr(b, k, v)
                b.save()
                self.log(request, f"Updated the banner “{b.title}”")
                self.audit(request, "banner.update", "banner", b.public_id, after={"title": b.title})
        return ok({"banner": banner_row(b)}, message="Banner saved.")

    def delete(self, request, public_id):
        with transaction.atomic():
            b = get_object_or_404(Banner, public_id=public_id)
            title, ref = b.title, b.public_id
            b.delete()
            self.log(request, f"Deleted the banner “{title}”")
            self.audit(request, "banner.delete", "banner", ref, before={"title": title})
        return ok({}, message="Banner deleted.")


class AdminBannerDuplicate(_Admin):
    def post(self, request, public_id):
        with transaction.atomic():
            b = get_object_or_404(Banner, public_id=public_id)
            copy = Banner.objects.create(
                title=f"{b.title} (copy)"[:60], subtitle=b.subtitle, cta=b.cta, link=b.link, placement=b.placement,
                audience=b.audience, image=b.image, start=b.start, end=b.end, active=False,
                position=_next_banner_position(b.placement), created_by=request.user.account)
            self.log(request, f"Duplicated the banner “{b.title}”")
        return created({"banner": banner_row(copy)}, message="Banner duplicated as a draft.")


def _swap(rows, current, step):
    """Swap `current` with its neighbour in the ordered `rows` list; returns False at the ends."""
    i = rows.index(current)
    j = i + step
    if not 0 <= j < len(rows):
        return False
    rows[i], rows[j] = rows[j], rows[i]
    for n, r in enumerate(rows, start=1):
        if r.position != n:
            type(r).objects.filter(pk=r.pk).update(position=n)
    return True


def _dir(request):
    d = request.data.get("dir")
    return d if d in (-1, 1) else None


class AdminBannerMove(_Admin):
    def post(self, request, public_id):
        step = _dir(request)
        if step is None:
            return fail("dir must be -1 or 1.", status=400)
        with transaction.atomic():
            b = get_object_or_404(Banner, public_id=public_id)
            rows = list(Banner.objects.select_for_update().filter(placement=b.placement).order_by("position", "id"))
            _swap(rows, next(r for r in rows if r.pk == b.pk), step)
        return ok({"results": [banner_row(x) for x in Banner.objects.all()]})


# --------------------------------------------------------------------------- #
# FAQs
# --------------------------------------------------------------------------- #
def faq_row(f):
    return {"id": f.public_id, "topic": f.topic, "q": f.question, "a": f.answer, "published": f.published,
            "helpful": f.helpful, "notHelpful": f.not_helpful}


def clean_faq(data):
    errs, out = {}, {}
    if data.get("topic") not in Faq.TOPICS:
        errs["topic"] = ["Choose a topic."]
    out["topic"] = data.get("topic")
    q = _text(data, "q")
    if len(q) < 8:
        errs["q"] = ["Write the question in at least 8 characters."]
    elif len(q) > 200:
        errs["q"] = ["Keep the question under 200 characters."]
    out["question"] = q
    a = str(data.get("a") or "").strip()
    if len(a) < 20:
        errs["a"] = ["Give a clear answer of at least 20 characters."]
    elif len(a) > 4000:
        errs["a"] = ["Keep the answer under 4000 characters."]
    out["answer"] = a
    return out, errs


class AdminFaqs(_Admin):
    def get(self, request):
        return ok({"results": [faq_row(f) for f in Faq.objects.all()]})

    def post(self, request):
        out, errs = clean_faq(request.data)
        if errs:
            return fail("Please fix the highlighted fields.", errors=errs, status=400)
        with transaction.atomic():
            top = Faq.objects.aggregate(m=Max("position"))["m"] or 0
            f = Faq.objects.create(position=top + 1, published=request.data.get("published") is not False, **out)
            self.log(request, f"Added the FAQ “{f.question}”")
            self.audit(request, "faq.create", "faq", f.public_id)
        return created({"faq": faq_row(f)}, message="FAQ added.")


class AdminFaqDetail(_Admin):
    def patch(self, request, public_id):
        with transaction.atomic():
            f = get_object_or_404(Faq.objects.select_for_update(), public_id=public_id)
            if set(request.data.keys()) <= {"published"}:
                if not isinstance(request.data.get("published"), bool):
                    return fail("Say whether the FAQ is published.", status=400)
                f.published = request.data["published"]
                f.save(update_fields=["published", "updated_at"])
                self.log(request, f"{'Published' if f.published else 'Unpublished'} the FAQ “{f.question}”")
            else:
                out, errs = clean_faq({"topic": f.topic, "q": f.question, "a": f.answer, **request.data})
                if errs:
                    return fail("Please fix the highlighted fields.", errors=errs, status=400)
                for k, v in out.items():
                    setattr(f, k, v)
                f.save()
                self.log(request, f"Edited the FAQ “{f.question}”")
            self.audit(request, "faq.update", "faq", f.public_id)
        return ok({"faq": faq_row(f)}, message="FAQ saved.")

    def delete(self, request, public_id):
        with transaction.atomic():
            f = get_object_or_404(Faq, public_id=public_id)
            question, ref = f.question, f.public_id
            f.delete()
            self.log(request, f"Deleted the FAQ “{question}”")
            self.audit(request, "faq.delete", "faq", ref)
        return ok({}, message="FAQ deleted.")


class AdminFaqMove(_Admin):
    def post(self, request, public_id):
        step = _dir(request)
        if step is None:
            return fail("dir must be -1 or 1.", status=400)
        with transaction.atomic():
            f = get_object_or_404(Faq, public_id=public_id)
            rows = list(Faq.objects.select_for_update().filter(topic=f.topic).order_by("position", "id"))
            cur = next(r for r in rows if r.pk == f.pk)
            # positions are global, so swap the two rows' positions rather than renumbering the topic
            i = rows.index(cur)
            j = i + step
            if 0 <= j < len(rows):
                a, b = rows[i], rows[j]
                Faq.objects.filter(pk=a.pk).update(position=b.position)
                Faq.objects.filter(pk=b.pk).update(position=a.position)
                if a.position == b.position:  # same slot (older rows): spread them out
                    for n, r in enumerate(Faq.objects.order_by("position", "id"), start=1):
                        Faq.objects.filter(pk=r.pk).update(position=n)
                    Faq.objects.filter(pk=a.pk).update(position=b.position + 1 if step == 1 else b.position)
        return ok({"results": [faq_row(x) for x in Faq.objects.all()]})


# --------------------------------------------------------------------------- #
# policies
# --------------------------------------------------------------------------- #
def policy_row(p, with_versions=True):
    never = not p.version
    row = {
        "key": p.key, "title": p.title, "icon": p.icon, "summary": p.summary,
        "version": p.version or "—", "status": "Draft" if never else "Published",
        "updatedAt": p.published_at or p.updated_at, "updatedBy": p.published_by or "ReOrbit team",
        "body": p.starter_body if never else p.body, "neverPublished": never,
        "draft": {"body": p.draft_body, "note": p.draft_note, "at": p.draft_at, "by": p.draft_by} if p.has_draft else None,
    }
    if with_versions:
        row["versions"] = [{"v": v.version, "at": v.created_at, "by": v.by_name, "note": v.note, "body": v.body}
                           for v in p.versions.all()]
    return row


def bump(version, major):
    a, b = (int(x) for x in str(version).split("."))
    return f"{a + 1}.0" if major else f"{a}.{b + 1}"


class AdminPolicies(_Admin):
    def get(self, request):
        return ok({"results": [policy_row(p) for p in Policy.objects.prefetch_related("versions")]})


class AdminPolicyDraft(_Admin):
    def post(self, request, key):
        body = str(request.data.get("body") or "").strip()
        if len(body) < 20 or len(body) > 60000:
            return fail("Write the policy text (at least 20 characters).", errors={"body": ["Write the policy text."]}, status=400)
        with transaction.atomic():
            p = get_object_or_404(Policy.objects.select_for_update(), key=key)
            p.draft_body, p.draft_note = body, _text(request.data, "note")[:200]
            p.draft_at, p.draft_by, p.has_draft = timezone.now(), self.who(request), True
            p.save()
            self.log(request, f"Saved a draft of {p.title}")
        return ok({"policy": policy_row(p)}, message="Draft saved.")

    def delete(self, request, key):
        with transaction.atomic():
            p = get_object_or_404(Policy.objects.select_for_update(), key=key)
            p.draft_body = p.draft_note = p.draft_by = ""
            p.draft_at, p.has_draft = None, False
            p.save()
            self.log(request, f"Discarded the draft of {p.title}")
        return ok({"policy": policy_row(p)}, message="Draft discarded.")


def _publish(p, body, note, major, by):
    first = not p.version
    v = "1.0" if first else bump(p.version, major)
    p.body, p.version, p.published_at, p.published_by = body, v, timezone.now(), by
    p.draft_body = p.draft_note = p.draft_by = ""
    p.draft_at, p.has_draft = None, False
    p.save()
    PolicyVersion.objects.create(policy=p, version=v, body=body, note=note[:200], by_name=by)
    return v


class AdminPolicyPublish(_Admin):
    def post(self, request, key):
        body = str(request.data.get("body") or "").strip()
        note = _text(request.data, "note")
        major = request.data.get("major") is True
        errs = {}
        if len(body) < 20 or len(body) > 60000:
            errs["body"] = ["Write the policy text (at least 20 characters)."]
        with transaction.atomic():
            p = get_object_or_404(Policy.objects.select_for_update(), key=key)
            if p.version and len(note) < 5:
                errs["note"] = ["Say what changed (at least 5 characters)."]
            if errs:
                return fail("Please fix the highlighted fields.", errors=errs, status=400)
            v = _publish(p, body, note or "First version", major, self.who(request))
            self.log(request, f"Published {p.title} version {v}")
            self.audit(request, "policy.publish", "policy", p.key, after={"version": v})
        return ok({"policy": policy_row(p), "version": v}, message=f"{p.title} version {v} is live.")


class AdminPolicyRestore(_Admin):
    def post(self, request, key):
        with transaction.atomic():
            p = get_object_or_404(Policy.objects.select_for_update(), key=key)
            old = get_object_or_404(PolicyVersion, policy=p, version=str(request.data.get("version") or ""))
            v = _publish(p, old.body, f"Restored version {old.version}", False, self.who(request))
            self.log(request, f"Published {p.title} version {v}")
            self.audit(request, "policy.restore", "policy", p.key, after={"version": v, "from": old.version})
        return ok({"policy": policy_row(p), "version": v}, message=f"Version {old.version} was restored as version {v}.")


class AdminLog(_Admin):
    def get(self, request):
        return ok({"results": [{"id": f"L{r.id}", "by": r.by_name, "text": r.text, "at": r.created_at}
                               for r in ContentLog.objects.all()[:30]]})
