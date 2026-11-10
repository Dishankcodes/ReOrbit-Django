from django.db import migrations


def _mask_upi(upi):
    if not upi:
        return ""
    name, _, host = upi.partition("@")
    return name[:2] + "•" * max(len(name) - 2, 0) + "@" + host


def encrypt_existing(apps, schema_editor):
    """Move plain bank/UPI values into encrypted columns, and strip full numbers out of the
    stored payout snapshots (a pending payout keeps one encrypted copy so it can still be paid)."""
    from apps.core.crypto import encrypt, encrypt_json

    Account = apps.get_model("payments", "PayoutAccount")
    for a in Account.objects.all():
        if a.account_number:
            a.account_number_enc, a.account_last4 = encrypt(a.account_number), a.account_number[-4:]
        if a.upi_id:
            a.upi_enc, a.upi_hint = encrypt(a.upi_id), _mask_upi(a.upi_id)
        a.save(update_fields=["account_number_enc", "account_last4", "upi_enc", "upi_hint"])

    Payout = apps.get_model("payments", "Payout")
    for p in Payout.objects.all():
        snap = dict(p.account or {})
        number, upi = snap.get("account_number", ""), snap.get("upi_id", "")
        if "•" in number or "•" in upi:  # already masked
            continue
        if p.status == "Pending":
            p.account_enc = encrypt_json(snap)
        snap["account_number"] = ("•" * 8 + number[-4:]) if number else ""
        snap["upi_id"] = _mask_upi(upi)
        p.account = snap
        p.save(update_fields=["account", "account_enc"])


class Migration(migrations.Migration):
    dependencies = [("payments", "0003_payout_secrets_add")]
    operations = [migrations.RunPython(encrypt_existing, migrations.RunPython.noop)]
