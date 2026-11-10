from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("payments", "0006_polymorphic_buyer")]

    operations = [
        migrations.AddIndex("payment", models.Index(fields=["buyer_key", "created_at"], name="pay_buyer_created_idx")),
        migrations.AddConstraint("payment", models.UniqueConstraint(
            fields=["buyer_key", "idempotency_key"], condition=models.Q(idempotency_key__isnull=False),
            name="pay_buyer_idem_unique")),
        migrations.AddConstraint("payment", models.CheckConstraint(condition=(
            models.Q(buyer_type="user", buyer_user__isnull=False, buyer_remaker__isnull=True, buyer_admin__isnull=True)
            | models.Q(buyer_type="remaker", buyer_remaker__isnull=False, buyer_user__isnull=True, buyer_admin__isnull=True)
            | models.Q(buyer_type="admin", buyer_admin__isnull=False, buyer_user__isnull=True, buyer_remaker__isnull=True)),
            name="pay_exactly_one_buyer")),
    ]
