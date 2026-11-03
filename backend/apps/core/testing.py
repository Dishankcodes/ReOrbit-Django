"""Shared test helpers. Every domain's tests should build on APIBase.

    class MyTests(APIBase):
        def test_x(self):
            user = self.make_user()
            r = self.get("/api/users/me/", as_=user)
"""

import re

from django.core import mail
from django.core.cache import cache
from rest_framework.test import APITestCase

from apps.accounts.tokens import create_token_pair
from apps.admins.models import Admins
from apps.remakers.models import ReMaker_Profile, ReMakers
from apps.users.models import User_Profile, Users

STRONG_PASSWORD = "Orbit-Test-7391!"


class APIBase(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()  # throttle counters live in the cache

    # ---- accounts ------------------------------------------------------ #
    def make_user(self, email="user@example.com", status=Users.Status.ACTIVE, **extra):
        user = Users(full_name="Test User", email=email, status=status, **extra)
        user.set_password(STRONG_PASSWORD)
        user.save()
        User_Profile.objects.create(user=user)
        return user

    def make_remaker(
        self, email="maker@example.com", username="Maker One", status=ReMakers.Status.ACTIVE
    ):
        remaker = ReMakers.objects.create(
            full_name="Test Maker", username=username, email=email, status=status
        )
        ReMaker_Profile.objects.create(remaker=remaker)
        return remaker

    def make_admin(
        self,
        email="admin@example.com",
        permission_level=Admins.PermissionLevel.ADMIN,
        modules=None,
        status=Admins.Status.ACTIVE,
    ):
        admin = Admins(
            full_name="Test Admin",
            email=email,
            permission_level=permission_level,
            modules=modules or {},
            status=status,
        )
        admin.set_password(STRONG_PASSWORD)
        admin.save()
        return admin

    # ---- requests ------------------------------------------------------ #
    def token_for(self, account):
        if isinstance(account, Users):
            return create_token_pair("user", account.user_id)["access"]
        if isinstance(account, ReMakers):
            return create_token_pair("remaker", account.remaker_id)["access"]
        return create_token_pair("admin", account.admin_id)["access"]

    def _headers(self, as_):
        return {"HTTP_AUTHORIZATION": f"Bearer {self.token_for(as_)}"} if as_ else {}

    def get(self, url, as_=None, **kw):
        return self.client.get(url, **self._headers(as_), **kw)

    def post(self, url, data=None, as_=None, **kw):
        return self.client.post(url, data or {}, format="json", **self._headers(as_), **kw)

    def patch(self, url, data=None, as_=None, **kw):
        return self.client.patch(url, data or {}, format="json", **self._headers(as_), **kw)

    def delete(self, url, as_=None, **kw):
        return self.client.delete(url, **self._headers(as_), **kw)

    # ---- helpers ------------------------------------------------------- #
    def last_otp(self):
        """The 6-digit code from the most recent email."""
        body = mail.outbox[-1].body
        return re.search(r"code is (\d{6})", body).group(1)

    def assertEnvelope(self, response, success=True):
        self.assertIn("success", response.data)
        self.assertEqual(response.data["success"], success)
        self.assertIn("message", response.data)
