from django.db import migrations, models


def fill_keys(apps, schema_editor):
    M = apps.get_model("payments", "Payment")
    for pk, uid in list(M.objects.values_list("pk", "buyer_user_id")):
        M.objects.filter(pk=pk).update(buyer_type="user", buyer_key=f"user:{uid}")


class Migration(migrations.Migration):
    dependencies = [
        ("payments", "0005_payout_secrets_drop"),
        ("remakers", "0003_remakerproduct"),
        ("admins", "0004_adminitem"),
        ("users", "0002_user_profile_bio_and_more"),
    ]

    operations = [
        migrations.RemoveIndex(model_name="payment", name="pay_buyer_created_idx"),
        migrations.RemoveConstraint(model_name="payment", name="pay_buyer_idem_unique"),
        migrations.RenameField("payment", "buyer", "buyer_user"),
        migrations.AlterField("payment", "buyer_user", models.ForeignKey(
            blank=True, null=True, on_delete=models.deletion.PROTECT, related_name="payments", to="users.users")),
        migrations.AddField("payment", "buyer_type", models.CharField(default="user", max_length=8)),
        migrations.AddField("payment", "buyer_key", models.CharField(default="", max_length=24)),
        migrations.AddField("payment", "buyer_remaker", models.ForeignKey(
            blank=True, null=True, on_delete=models.deletion.PROTECT, related_name="payments", to="remakers.remakers")),
        migrations.AddField("payment", "buyer_admin", models.ForeignKey(
            blank=True, null=True, on_delete=models.deletion.PROTECT, related_name="payments", to="admins.admins")),
        migrations.RunPython(fill_keys, migrations.RunPython.noop),
    ]
