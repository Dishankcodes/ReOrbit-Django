"""Branded ReOrbit emails (HTML + plain text), sent the same way as OTP codes:
Mailjet when its keys are set, otherwise Django's EMAIL_BACKEND (console locally, mail.outbox in
tests). Sending never raises: a failed email is logged and the caller carries on.
"""

import html
import logging

from apps.accounts.otp import _deliver

log = logging.getLogger(__name__)

GREEN, INK, MUTED, LINE, SOFT = "#2a4d3a", "#1f2923", "#6b756d", "#dce5de", "#f2f6f3"


def _rows(facts):
    out = []
    for label, value in facts:
        out.append(
            f'<tr><td style="padding:6px 0;color:{MUTED};font-size:13px;width:110px;vertical-align:top">'
            f'{html.escape(str(label))}</td><td style="padding:6px 0;color:{INK};font-size:13px;font-weight:600">'
            f'{html.escape(str(value))}</td></tr>'
        )
    return "".join(out)


def render(heading, intro="", facts=(), quote="", cta=None, footer=""):
    """Returns (text, html) for one email."""
    quote_html = (
        f'<div style="margin:18px 0;padding:14px 16px;border-left:3px solid {GREEN};background:{SOFT};'
        f'border-radius:8px;color:{INK};font-size:14px;line-height:1.6;white-space:pre-wrap">{html.escape(quote)}</div>'
        if quote else ""
    )
    facts_html = (
        f'<table role="presentation" style="width:100%;border-collapse:collapse;margin:14px 0;border-top:1px solid {LINE};'
        f'border-bottom:1px solid {LINE}">{_rows(facts)}</table>' if facts else ""
    )
    cta_html = (
        f'<p style="margin:22px 0 4px"><a href="{html.escape(cta[1])}" style="display:inline-block;padding:11px 20px;'
        f'border-radius:999px;background:{GREEN};color:#fff;text-decoration:none;font-weight:700;font-size:14px">'
        f'{html.escape(cta[0])}</a></p>' if cta else ""
    )
    body = f"""<!doctype html><html><body style="margin:0;background:#eef1ee;font-family:Segoe UI,Arial,sans-serif">
<table role="presentation" width="100%" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:{GREEN};padding:20px 26px;color:#fff;font-size:20px;font-weight:800">ReOrbit
<div style="font-size:10px;letter-spacing:2px;font-weight:600;opacity:.75">REUSE · RECREATE · REIMAGINE</div></td></tr>
<tr><td style="padding:26px">
<h1 style="margin:0 0 10px;color:{INK};font-size:20px">{html.escape(heading)}</h1>
<p style="margin:0;color:{INK};font-size:14px;line-height:1.6">{html.escape(intro)}</p>
{facts_html}{quote_html}{cta_html}
</td></tr>
<tr><td style="padding:16px 26px;background:#fafbf9;border-top:1px solid {LINE};color:{MUTED};font-size:12px;line-height:1.5">
{html.escape(footer or "You are receiving this because of activity on ReOrbit. Reply to this email if you need help.")}
</td></tr></table></td></tr></table></body></html>"""
    text = "\n".join(
        [heading, "", intro]
        + ([""] + [f"{k}: {v}" for k, v in facts] if facts else [])
        + (["", quote] if quote else [])
        + ([f"", f"{cta[0]}: {cta[1]}"] if cta else [])
        + ["", footer or "ReOrbit"]
    )
    return text, body


def send(to, subject, **parts):
    """Send one branded email to each address in `to`. Returns how many were handed over."""
    text, body = render(**parts)
    sent = 0
    for addr in ([to] if isinstance(to, str) else list(to)):
        try:
            _deliver(addr, subject, text, body)
            sent += 1
        except Exception:  # noqa: BLE001
            log.exception("email to %s failed: %s", addr, subject)
    return sent
