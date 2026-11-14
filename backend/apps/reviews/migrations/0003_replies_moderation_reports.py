import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("admins", "0005_adminitem_sell_fields"),
        ("remakers", "0004_remakerproduct_pickup_preference"),
        ("users", "0002_user_profile_bio_and_more"),
        ("reviews", "0002_remove_productreview_prodrev_one_reviewer_and_more"),
    ]

    operations = [
        # --- ProductReview: reply + moderation (SellerReview keeps its existing reply columns)
        migrations.AddField(model_name="productreview", name="reply", field=models.CharField(blank=True, max_length=500)),
        migrations.AddField(model_name="productreview", name="replied_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="productreview", name="reply_edited", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="sellerreview", name="reply_edited", field=models.BooleanField(default=False)),
        *[
            op
            for model in ("productreview", "sellerreview")
            for op in (
                migrations.AddField(
                    model_name=model, name="status",
                    field=models.CharField(choices=[("Visible", "Visible"), ("Hidden", "Hidden")], db_index=True, default="Visible", max_length=8),
                ),
                migrations.AddField(model_name=model, name="hidden_reason", field=models.CharField(blank=True, max_length=300)),
                migrations.AddField(model_name=model, name="hidden_at", field=models.DateTimeField(blank=True, null=True)),
                migrations.AddField(
                    model_name=model, name="hidden_by",
                    field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.admins"),
                ),
            )
        ],
        migrations.CreateModel(
            name="ReviewReport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("reporter_type", models.CharField(max_length=8)),
                ("reporter_key", models.CharField(db_index=True, max_length=24)),
                ("reason", models.CharField(max_length=60)),
                ("note", models.CharField(blank=True, max_length=500)),
                ("status", models.CharField(choices=[("Pending", "Pending"), ("Upheld", "Upheld"), ("Dismissed", "Dismissed")], db_index=True, default="Pending", max_length=10)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("resolution_note", models.CharField(blank=True, max_length=300)),
                ("product_review", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="reports", to="reviews.productreview")),
                ("seller_review", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="reports", to="reviews.sellerreview")),
                ("reporter_user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="+", to="users.users")),
                ("reporter_remaker", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="+", to="remakers.remakers")),
                ("resolved_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.admins")),
            ],
            options={"db_table": "review_reports", "ordering": ["-created_at", "-pk"]},
        ),
        migrations.AddConstraint(
            model_name="reviewreport",
            constraint=models.CheckConstraint(
                condition=models.Q(("product_review__isnull", False), ("seller_review__isnull", True))
                | models.Q(("product_review__isnull", True), ("seller_review__isnull", False)),
                name="revreport_one_review",
            ),
        ),
        migrations.AddConstraint(
            model_name="reviewreport",
            constraint=models.CheckConstraint(
                condition=models.Q(("reporter_type", "user"), ("reporter_user__isnull", False), ("reporter_remaker__isnull", True))
                | models.Q(("reporter_type", "remaker"), ("reporter_remaker__isnull", False), ("reporter_user__isnull", True)),
                name="revreport_one_reporter",
            ),
        ),
        migrations.AddConstraint(
            model_name="reviewreport",
            constraint=models.UniqueConstraint(
                condition=models.Q(("product_review__isnull", False)), fields=("reporter_key", "product_review"),
                name="revreport_once_per_product_review",
            ),
        ),
        migrations.AddConstraint(
            model_name="reviewreport",
            constraint=models.UniqueConstraint(
                condition=models.Q(("seller_review__isnull", False)), fields=("reporter_key", "seller_review"),
                name="revreport_once_per_seller_review",
            ),
        ),
    ]
