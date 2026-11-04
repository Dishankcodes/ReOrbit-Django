from unittest import mock

from django.test import override_settings

from apps.accounts import google
from apps.accounts.google import GoogleAuthError, issue_signup_token
from apps.core.testing import APIBase
from apps.remakers.models import ReMakers
from apps.users.models import Users

G = {"sub": "google-sub-1", "email": "person@gmail.com", "full_name": "Pat Person"}
USER_URL = "/api/users/auth/google/"
REMAKER_URL = "/api/remakers/auth/google/"


def _user_patch(profile=G):
    return mock.patch("apps.users.views.profile_from_code", return_value=dict(profile))


def _remaker_patch(profile=G):
    return mock.patch("apps.remakers.views.profile_from_code", return_value=dict(profile))


@override_settings(GOOGLE_CLIENT_ID="cid", GOOGLE_CLIENT_SECRET="secret")
class GoogleServiceTests(APIBase):
    def _post(self, status=200, body=None):
        resp = mock.Mock(status_code=status, text="x")
        resp.json.return_value = body or {"id_token": "jwt"}
        return mock.patch("apps.accounts.google.requests.post", return_value=resp)

    def test_good_code_returns_profile(self):
        info = {"sub": "s1", "email": "A@Gmail.com", "email_verified": True, "name": "Ann"}
        with self._post(), mock.patch.object(google, "_verify_id_token", return_value=info):
            p = google.profile_from_code("code")
        self.assertEqual(p, {"sub": "s1", "email": "a@gmail.com", "full_name": "Ann"})

    def test_unverified_google_email_is_refused(self):
        info = {"sub": "s1", "email": "a@gmail.com", "email_verified": False}
        with self._post(), mock.patch.object(google, "_verify_id_token", return_value=info):
            with self.assertRaises(GoogleAuthError):
                google.profile_from_code("code")

    def test_google_rejecting_the_code(self):
        with self._post(status=400):
            with self.assertRaises(GoogleAuthError):
                google.profile_from_code("bad")

    def test_missing_code(self):
        with self.assertRaises(GoogleAuthError) as ctx:
            google.profile_from_code("")
        self.assertEqual(ctx.exception.status, 400)

    @override_settings(GOOGLE_CLIENT_ID="")
    def test_not_configured_is_503(self):
        with self.assertRaises(GoogleAuthError) as ctx:
            google.profile_from_code("code")
        self.assertEqual(ctx.exception.status, 503)

    def test_signup_token_round_trip_and_tamper(self):
        token = issue_signup_token(G)
        self.assertEqual(google.read_signup_token(token)["email"], G["email"])
        with self.assertRaises(GoogleAuthError):
            google.read_signup_token(token + "x")


class UserGoogleTests(APIBase):
    def test_new_google_user_is_created(self):
        with _user_patch():
            r = self.post(USER_URL, {"code": "c"})
        self.assertEqual(r.status_code, 201)
        user = Users.objects.get()
        self.assertEqual(user.auth_provider, "google")
        self.assertEqual(user.google_id, "google-sub-1")
        self.assertIsNone(user.password)
        self.assertTrue(user.email_verified_at)
        self.assertTrue(user.profile)
        self.assertIn("access", r.data["data"])

    def test_returning_google_user_signs_in(self):
        with _user_patch():
            self.post(USER_URL, {"code": "c"})
            r = self.post(USER_URL, {"code": "c2"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Users.objects.count(), 1)

    def test_existing_unverified_password_account_is_linked_and_password_removed(self):
        user = self.make_user(email="person@gmail.com")
        self.assertTrue(user.password)
        with _user_patch():
            r = self.post(USER_URL, {"code": "c"})
        self.assertEqual(r.status_code, 200)
        user.refresh_from_db()
        self.assertEqual(user.google_id, "google-sub-1")
        self.assertIsNone(user.password)  # may have been set by an impostor
        self.assertTrue(user.email_verified_at)

    def test_verified_account_keeps_its_password(self):
        from django.utils import timezone

        user = self.make_user(email="person@gmail.com", email_verified_at=timezone.now())
        with _user_patch():
            self.post(USER_URL, {"code": "c"})
        user.refresh_from_db()
        self.assertTrue(user.password)
        self.assertEqual(user.google_id, "google-sub-1")

    def test_remaker_email_is_refused(self):
        self.make_remaker(email="person@gmail.com")
        with _user_patch():
            r = self.post(USER_URL, {"code": "c"})
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.data["code"], "EMAIL_USED_BY_REMAKER")
        self.assertEqual(Users.objects.count(), 0)

    def test_google_failure_is_reported(self):
        with mock.patch("apps.users.views.profile_from_code", side_effect=GoogleAuthError("nope", 401)):
            r = self.post(USER_URL, {"code": "c"})
        self.assertEqual(r.status_code, 401)
        self.assertEqual(r.data["code"], "GOOGLE_AUTH_FAILED")

    def test_blocked_google_user_can_sign_in_to_see_status(self):
        self.make_user(email="person@gmail.com", status="Blocked", google_id="google-sub-1")
        with _user_patch():
            r = self.post(USER_URL, {"code": "c"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["data"]["user"]["status"], "Blocked")

    def test_different_google_account_same_email_is_refused(self):
        self.make_user(email="person@gmail.com", google_id="someone-else")
        with _user_patch():
            r = self.post(USER_URL, {"code": "c"})
        self.assertEqual(r.status_code, 409)


class ReMakerGoogleTests(APIBase):
    def test_new_person_must_choose_a_username(self):
        with _remaker_patch():
            r = self.post(REMAKER_URL, {"code": "c"})
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["data"]["needs_registration"])
        self.assertEqual(ReMakers.objects.count(), 0)

        with mock.patch("apps.remakers.views.profile_from_code") as never:
            r2 = self.post(
                REMAKER_URL,
                {"google_token": r.data["data"]["google_token"], "username": "Pat Studio"},
            )
            never.assert_not_called()  # the one-time code is not used twice
        self.assertEqual(r2.status_code, 201)
        remaker = ReMakers.objects.get()
        self.assertEqual(remaker.auth_provider, "google")
        self.assertEqual(remaker.username, "Pat Studio")
        self.assertTrue(remaker.profile)

    def test_name_from_google_can_be_edited_on_the_profile_step(self):
        token = issue_signup_token(G)
        r = self.post(
            REMAKER_URL,
            {"google_token": token, "username": "Pat Studio", "full_name": "  Patricia Person "},
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(ReMakers.objects.get().full_name, "Patricia Person")
        self.assertEqual(r.data["data"]["remaker"]["full_name"], "Patricia Person")

    def test_google_name_is_used_when_not_edited(self):
        r = self.post(REMAKER_URL, {"google_token": issue_signup_token(G), "username": "Pat Studio"})
        self.assertEqual(ReMakers.objects.get().full_name, "Pat Person")

    def test_taken_or_bad_username(self):
        self.make_remaker(email="other@x.com", username="Pat Studio")
        token = issue_signup_token(G)
        r = self.post(REMAKER_URL, {"google_token": token, "username": "pat studio"})
        self.assertEqual(r.status_code, 409)
        r = self.post(REMAKER_URL, {"google_token": token, "username": "x"})
        self.assertEqual(r.status_code, 400)

    def test_tampered_token_is_refused(self):
        r = self.post(REMAKER_URL, {"google_token": "garbage", "username": "Pat Studio"})
        self.assertEqual(r.status_code, 401)
        self.assertEqual(ReMakers.objects.count(), 0)

    def test_existing_remaker_signs_in_and_is_linked(self):
        remaker = self.make_remaker(email="person@gmail.com")
        with _remaker_patch():
            r = self.post(REMAKER_URL, {"code": "c"})
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.data["data"])
        remaker.refresh_from_db()
        self.assertEqual(remaker.google_id, "google-sub-1")

    def test_user_email_is_refused(self):
        self.make_user(email="person@gmail.com")
        with _remaker_patch():
            r = self.post(REMAKER_URL, {"code": "c"})
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.data["code"], "EMAIL_USED_BY_USER")
