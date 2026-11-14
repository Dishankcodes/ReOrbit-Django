"""Rewards API (mounted at /api/rewards/).

  GET me/vouchers/    the signed-in member's donation vouchers: {vouchers: [...], ready: n}
"""

from rest_framework.views import APIView

from apps.accounts.permissions import IsReOrbitUser
from apps.core.responses import ok

from .models import Voucher
from .services import voucher_data


class MyVouchers(APIView):
    permission_classes = [IsReOrbitUser]  # vouchers belong to member accounts

    def get(self, request):
        rows = list(Voucher.objects.filter(owner=request.user.account))
        data = [voucher_data(v) for v in rows]
        return ok({"vouchers": data, "ready": sum(1 for v in data if v["status"] == "Active")})
