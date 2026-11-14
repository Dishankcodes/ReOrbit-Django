"""The donation certificate PDF. One page, generated once at Completed and re-usable after that."""

import io

from django.core.files.base import ContentFile
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

BRAND = HexColor("#1f7a4d")
INK = HexColor("#1a1a1a")
MUTED = HexColor("#555555")


def render(donation):
    """Return (filename, bytes) for the donation's certificate. Does not save it."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4

    c.setStrokeColor(BRAND)
    c.setLineWidth(3)
    c.rect(12 * mm, 12 * mm, w - 24 * mm, h - 24 * mm)

    c.setFillColor(BRAND)
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(w / 2, h - 45 * mm, "Certificate of Donation")

    c.setFillColor(INK)
    c.setFont("Helvetica", 13)
    c.drawCentredString(w / 2, h - 65 * mm, "This certifies that")

    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(w / 2, h - 78 * mm, donation.donor.full_name)

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 13)
    qty = donation.distributed_quantity or donation.effective_quantity
    body = f"donated {qty} item(s) of {donation.category} to ReOrbit,"
    c.drawCentredString(w / 2, h - 92 * mm, body)
    when = donation.distributed_at or donation.completed_at
    tail = f"handed on {when.strftime('%d %B %Y')}" + (f" to {donation.ngo}." if donation.ngo else ".")
    c.drawCentredString(w / 2, h - 100 * mm, tail)

    c.setFillColor(INK)
    c.setFont("Helvetica", 11)
    c.drawCentredString(w / 2, h - 120 * mm, "Thank you for helping extend the life of what you no longer need.")

    c.setFont("Helvetica", 9)
    c.setFillColor(MUTED)
    c.drawString(20 * mm, 20 * mm, f"Certificate ID: {donation.certificate_id}")
    c.drawRightString(w - 20 * mm, 20 * mm, f"Donation: {donation.public_id}")

    c.showPage()
    c.save()
    return f"{donation.certificate_id}.pdf", buf.getvalue()


def attach(donation):
    """Render the certificate and save it onto the donation. Call after certificate_id is set."""
    name, data = render(donation)
    donation.certificate_file.save(name, ContentFile(data), save=False)
