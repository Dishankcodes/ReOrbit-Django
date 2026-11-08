import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("admins", "0004_adminitem"),
        ("remakers", "0003_remakerproduct"),
        ("listings", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="mediaimage",
            name="remaker_product",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="images", to="remakers.remakerproduct"),
        ),
        migrations.AddField(
            model_name="mediaimage",
            name="admin_item",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="images", to="admins.adminitem"),
        ),
        migrations.AddIndex(
            model_name="mediaimage",
            index=models.Index(fields=["remaker_product", "display_order"], name="media_rprod_order_idx"),
        ),
        migrations.AddIndex(
            model_name="mediaimage",
            index=models.Index(fields=["admin_item", "display_order"], name="media_aitem_order_idx"),
        ),
        migrations.AddConstraint(
            model_name="mediaimage",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(item__isnull=False, remaker_product__isnull=True, admin_item__isnull=True)
                    | models.Q(item__isnull=True, remaker_product__isnull=False, admin_item__isnull=True)
                    | models.Q(item__isnull=True, remaker_product__isnull=True, admin_item__isnull=False)
                ),
                name="media_exactly_one_parent",
            ),
        ),
    ]
