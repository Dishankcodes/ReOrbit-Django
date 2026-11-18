from decimal import Decimal
from types import SimpleNamespace as N

from django.test import SimpleTestCase
from django.utils import timezone

from apps.donations import certificates


class CertificatePdfTests(SimpleTestCase):
    def test_pdf_has_the_logo_and_renders(self):
        self.assertTrue(certificates.LOGO.exists())
        d = N(donor=N(full_name="Asha Shah"), distributed_quantity=None, effective_quantity=3, category="Books",
              distributed_at=None, completed_at=timezone.now(), ngo="Some NGO", certificate_id="CERT-1",
              public_id="DON-1", weight_kg=Decimal("4.5"), reward_points=120)
        from unittest import mock

        with mock.patch("apps.rewards.services.co2_saved", return_value=Decimal("8.55")):
            name, data = certificates.render(d)
        self.assertEqual(name, "CERT-1.pdf")
        self.assertTrue(data.startswith(b"%PDF"))
        self.assertNotIn(b"Some NGO", data)  # where it went is not printed
