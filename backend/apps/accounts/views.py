from rest_framework.response import Response
from rest_framework.views import APIView


class AccountsStatusView(APIView):

    def get(self, request):
        return Response({
            'success': True,
            'message': 'ReOrbit Accounts API is working.'
        })