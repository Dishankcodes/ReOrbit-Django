from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("orders", "0002_polymorphic_buyer")]

    operations = [
        migrations.AddIndex("order", models.Index(fields=["buyer_key", "-created_at"], name="ord_buyer_created_idx")),
        migrations.AddConstraint("order", models.CheckConstraint(condition=(
            models.Q(buyer_type="user", buyer_user__isnull=False, buyer_remaker__isnull=True, buyer_admin__isnull=True)
            | models.Q(buyer_type="remaker", buyer_remaker__isnull=False, buyer_user__isnull=True, buyer_admin__isnull=True)
            | models.Q(buyer_type="admin", buyer_admin__isnull=False, buyer_user__isnull=True, buyer_remaker__isnull=True)),
            name="order_exactly_one_buyer")),
    ]
