from unittest import mock

from django.test import SimpleTestCase, override_settings

from apps.accounts import otp

KEYS = dict(BREVO_API_KEY="b", RESEND_API_KEY="", MAILJET_API_KEY="m", MAILJET_SECRET_KEY="s",
            MAILJET_SENDER_EMAIL="", EMAIL_SENDER="hello@example.com", EMAIL_PROVIDERS="")


def reply(code, body="{}", json=None):
    r = mock.Mock(status_code=code, text=body)
    r.json.return_value = json or {}
    return r


class EmailProviderTests(SimpleTestCase):
    @override_settings(**KEYS)
    def test_brevo_first_then_mailjet_as_backup(self):
        self.assertEqual(otp.email_providers(), ["brevo", "mailjet"])
        with mock.patch("apps.accounts.otp.requests.post", return_value=reply(201)) as post:
            otp._deliver("a@example.com", "Hi", "text", "<p>html</p>")
        self.assertEqual(post.call_count, 1)
        self.assertIn("brevo.com", post.call_args.args[0])
        self.assertEqual(post.call_args.kwargs["json"]["sender"]["email"], "hello@example.com")

    @override_settings(**KEYS)
    def test_a_refused_provider_falls_back_to_the_next(self):
        ok = reply(200, json={"Messages": [{"Status": "success"}]})
        with mock.patch("apps.accounts.otp.requests.post", side_effect=[reply(401, "blocked"), ok]) as post:
            otp._deliver("a@example.com", "Hi", "text", "<p>html</p>")
        self.assertIn("mailjet.com", post.call_args.args[0])

    @override_settings(**KEYS)
    def test_every_provider_refusing_raises_with_their_reasons(self):
        with mock.patch("apps.accounts.otp.requests.post", side_effect=[reply(401, "brevo says no"), reply(401, "mailjet blocked")]):
            with self.assertRaisesRegex(RuntimeError, "brevo says no.*mailjet blocked"):
                otp._deliver("a@example.com", "Hi", "text", "<p>html</p>")

    @override_settings(**{**KEYS, "EMAIL_PROVIDERS": "resend,mailjet", "RESEND_API_KEY": "r"})
    def test_order_can_be_set_and_resend_works(self):
        self.assertEqual(otp.email_providers(), ["resend", "mailjet"])
        with mock.patch("apps.accounts.otp.requests.post", return_value=reply(200)) as post:
            otp._deliver("a@example.com", "Hi", "text", "<p>html</p>")
        self.assertIn("resend.com", post.call_args.args[0])
        self.assertEqual(post.call_args.kwargs["json"]["from"], "ReOrbit <hello@example.com>")

    @override_settings(BREVO_API_KEY="", RESEND_API_KEY="", MAILJET_API_KEY="", EMAIL_PROVIDERS="")
    def test_no_keys_uses_django_email(self):
        self.assertEqual(otp.email_providers(), [])
        with mock.patch("apps.accounts.otp.send_mail") as sm:
            otp._deliver("a@example.com", "Hi", "text", "<p>html</p>")
        sm.assert_called_once()
