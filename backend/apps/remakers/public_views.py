from django.shortcuts import get_object_or_404
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination
from apps.core.responses import ok

from .models import ReMakers
from .public_serializers import PublicReMakerSerializer


class PublicReMakerList(ListAPIView):
    """Public directory of active ReMakers. Does not expose account email or contact details."""

    authentication_classes = []
    permission_classes = [AllowAny]
    pagination_class = StandardPagination
    serializer_class = PublicReMakerSerializer

    def get_queryset(self):
        return (
            ReMakers.objects.filter(status=ReMakers.Status.ACTIVE)
            .select_related("profile")
            .order_by("full_name", "pk")
        )

    def get_serializer_context(self):
        return {"request": self.request}


class PublicReMakerDetail(APIView):
    """Public profile for one active ReMaker, identified by public ID."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, public_id):
        remaker = get_object_or_404(
            ReMakers.objects.filter(status=ReMakers.Status.ACTIVE).select_related("profile"),
            public_id=public_id,
        )
        serializer = PublicReMakerSerializer(remaker, context={"request": request})
        return ok({"remaker": serializer.data})
