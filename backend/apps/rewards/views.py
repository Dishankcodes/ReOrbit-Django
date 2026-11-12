from rest_framework.views import APIView

from apps.accounts.permissions import IsReOrbitUser
from apps.core.responses import ok

from .models import Voucher
from .services import voucher_data


class MyVouchers(APIView):
    """GET /api/rewards/me/vouchers/  the member's vouchers, ready ones first."""
    permission_classes = [IsReOrbitUser]

    def get(self, request):
        rows = [voucher_data(v) for v in Voucher.objects.filter(owner=request.user.account)]
        order = {"Active": 0, "Used": 1, "Expired": 2}
        rows.sort(key=lambda r: order.get(r["status"], 3))
        return ok({"vouchers": rows, "ready": sum(1 for r in rows if r["status"] == "Active")})
