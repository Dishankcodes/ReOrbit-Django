"""The Razorpay SDK must work on servers whose setuptools no longer ships pkg_resources."""

import sys
from unittest import mock

from django.test import SimpleTestCase, override_settings

from apps.payments import gateway


class _HidePkgResources:
    def find_spec(self, name, path=None, target=None):
        if name == "pkg_resources":
            raise ModuleNotFoundError("No module named 'pkg_resources'")
        return None


@override_settings(RAZORPAY_KEY_ID="rzp_test_x", RAZORPAY_KEY_SECRET="secret")
class RazorpayWithoutPkgResourcesTests(SimpleTestCase):
    def setUp(self):
        self.saved = {k: sys.modules.pop(k) for k in list(sys.modules)
                      if k == "pkg_resources" or k == "razorpay" or k.startswith("razorpay.")}
        self.hider = _HidePkgResources()
        sys.meta_path.insert(0, self.hider)

    def tearDown(self):
        sys.meta_path.remove(self.hider)
        for k in [k for k in sys.modules if k == "pkg_resources" or k == "razorpay" or k.startswith("razorpay.")]:
            sys.modules.pop(k)
        sys.modules.update(self.saved)

    def test_order_is_created_with_the_stand_in(self):
        reply = mock.Mock(status_code=200)
        reply.json.return_value = {"id": "order_123", "amount": 49900}
        with mock.patch("requests.Session.request", return_value=reply) as call:
            order = gateway.create_order(499, "ORD-1001")
        self.assertEqual(order["id"], "order_123")
        self.assertIn("/orders", str(call.call_args))
        self.assertTrue(hasattr(sys.modules["pkg_resources"], "require"))
