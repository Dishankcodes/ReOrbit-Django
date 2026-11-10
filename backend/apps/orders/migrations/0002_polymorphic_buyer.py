from django.db import migrations, models


def fill_keys(apps, schema_editor):
    M = apps.get_model("orders", "Order")
    for pk, uid in list(M.objects.values_list("pk", "buyer_user_id")):
        M.objects.filter(pk=pk).update(buyer_type="user", buyer_key=f"user:{uid}")


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0001_initial"),
        ("remakers", "0003_remakerproduct"),
        ("admins", "0004_adminitem"),
        ("users", "0002_user_profile_bio_and_more"),
    ]

    operations = [
        migrations.RemoveIndex(model_name="order", name="ord_buyer_created_idx"),
        migrations.RenameField("order", "buyer", "buyer_user"),
        migrations.AlterField("order", "buyer_user", models.ForeignKey(
            blank=True, null=True, on_delete=models.deletion.PROTECT, related_name="orders", to="users.users")),
        migrations.AddField("order", "buyer_type", models.CharField(default="user", max_length=8)),
        migrations.AddField("order", "buyer_key", models.CharField(default="", max_length=24)),
        migrations.AddField("order", "buyer_remaker", models.ForeignKey(
            blank=True, null=True, on_delete=models.deletion.PROTECT, related_name="orders", to="remakers.remakers")),
        migrations.AddField("order", "buyer_admin", models.ForeignKey(
            blank=True, null=True, on_delete=models.deletion.PROTECT, related_name="orders", to="admins.admins")),
        migrations.RunPython(fill_keys, migrations.RunPython.noop),
    ]
