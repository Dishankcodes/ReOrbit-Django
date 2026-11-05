"""Read-only admin lists of members (users / remakers).

?search=  name, email, id, city      ?status=Active|Suspended|Blocked|Deleted
?auth_provider=email|google          ?ordering=newest|oldest|name   ?page= &page_size=
"""

from django.db.models import Q
from rest_framework.generics import ListAPIView, RetrieveAPIView

from apps.accounts.permissions import IsReOrbitAdmin
from apps.core.pagination import StandardPagination

ORDERING = {"newest": "-created_at", "oldest": "created_at", "name": "full_name"}


class AdminAccountMixin:
    pagination_class = StandardPagination
    search_fields = ()
    lookup_field = "public_id"

    def get_queryset(self):
        qs = self.queryset.select_related("profile")
        params = self.request.query_params
        search = (params.get("search") or "").strip()
        if search:
            query = Q()
            for field in self.search_fields:
                query |= Q(**{f"{field}__icontains": search})
            qs = qs.filter(query)
        status_value = params.get("status")
        if status_value:
            qs = qs.filter(status=status_value)
        provider = params.get("auth_provider")
        if provider:
            qs = qs.filter(auth_provider=provider)
        return qs.order_by(ORDERING.get(params.get("ordering"), "-created_at"), "pk")

    def get_serializer_context(self):
        return {"request": self.request}


class AdminAccountList(AdminAccountMixin, ListAPIView):
    pass


class AdminAccountDetail(AdminAccountMixin, RetrieveAPIView):
    def retrieve(self, request, *args, **kwargs):
        from apps.core.responses import ok

        return ok({"account": self.get_serializer(self.get_object()).data})


__all__ = ["AdminAccountList", "AdminAccountDetail", "IsReOrbitAdmin"]
