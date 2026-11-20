"""Browser security headers on the API, and Django's own /admin/ site being closed."""

from apps.core.testing import APIBase


class SecurityHeaderTests(APIBase):
    def test_api_answers_carry_a_strict_policy(self):
        r = self.client.get("/api/core/settings/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("default-src 'none'", r["Content-Security-Policy"])
        self.assertIn("camera=()", r["Permissions-Policy"])
        self.assertEqual(r["X-Content-Type-Options"], "nosniff")

    def test_django_admin_site_is_closed(self):
        self.assertEqual(self.client.get("/admin/").status_code, 404)
        self.assertEqual(self.client.get("/admin/login/").status_code, 404)


class ServerTimingTests(APIBase):
    """Audit L7: query counts are only shown while developing."""

    def test_hidden_live_shown_in_debug(self):
        from django.test import override_settings

        with override_settings(DEBUG=False):
            self.assertNotIn("Server-Timing", self.client.get("/api/core/settings/"))
        with override_settings(DEBUG=True):
            self.assertIn("Server-Timing", self.client.get("/api/core/settings/"))
