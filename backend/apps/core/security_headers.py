"""Extra browser security headers on every API answer.

The API only returns JSON (and a few files), so nothing in it should ever run as a page: a strict
Content-Security-Policy and a Permissions-Policy cost nothing and stop an answer from being used in a
frame or as a script if something ever went wrong. Django's SecurityMiddleware already adds HSTS,
nosniff, the referrer policy and X-Frame-Options (see settings).
"""

API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
PERMISSIONS = "camera=(), microphone=(), geolocation=(), payment=(), usb=()"


class ApiSecurityHeaders:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith("/api/"):
            response.headers.setdefault("Content-Security-Policy", API_CSP)
            response.headers.setdefault("Permissions-Policy", PERMISSIONS)
            response.headers.setdefault("Cross-Origin-Resource-Policy", "cross-origin")
        return response
