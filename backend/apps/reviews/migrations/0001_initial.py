import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("users", "0002_user_profile_bio_and_more"),
        ("remakers", "0004_remakerproduct_pickup_preference"),
        ("orders", "0004_returns_cod_failed"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductReview",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("reviewer_type", models.CharField(max_length=8)),
                ("reviewer_key", models.CharField(db_index=True, max_length=24)),
                ("rating", models.PositiveSmallIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("body", models.CharField(blank=True, max_length=1000)),
                ("edited_at", models.DateTimeField(blank=True, null=True)),
                ("reviewer_user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="+", to="users.users")),
                ("reviewer_remaker", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="+", to="remakers.remakers")),
                ("title", models.CharField(blank=True, max_length=80)),
                ("quality", models.PositiveSmallIntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("as_described", models.PositiveSmallIntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("value", models.PositiveSmallIntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("packaging", models.PositiveSmallIntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("recommend", models.BooleanField(default=True)),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="product_reviews", to="orders.order")),
                ("order_item", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="review", to="orders.orderitem")),
            ],
            options={"db_table": "product_reviews", "ordering": ["-created_at", "-pk"], "abstract": False},
        ),
        migrations.CreateModel(
            name="ProductReviewPhoto",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to="reviews/")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("review", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="photos", to="reviews.productreview")),
            ],
            options={"db_table": "product_review_photos", "ordering": ["pk"]},
        ),
        migrations.CreateModel(
            name="SellerReview",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("reviewer_type", models.CharField(max_length=8)),
                ("reviewer_key", models.CharField(db_index=True, max_length=24)),
                ("rating", models.PositiveSmallIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("body", models.CharField(blank=True, max_length=1000)),
                ("edited_at", models.DateTimeField(blank=True, null=True)),
                ("reviewer_user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="+", to="users.users")),
                ("reviewer_remaker", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="+", to="remakers.remakers")),
                ("seller_type", models.CharField(max_length=8)),
                ("seller_user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="seller_reviews", to="users.users")),
                ("seller_remaker", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="seller_reviews", to="remakers.remakers")),
                ("communication", models.PositiveSmallIntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("packing", models.PositiveSmallIntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("dispatch", models.PositiveSmallIntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("as_promised", models.PositiveSmallIntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ("tags", models.JSONField(blank=True, default=list)),
                ("reply", models.CharField(blank=True, max_length=500)),
                ("replied_at", models.DateTimeField(blank=True, null=True)),
                ("order", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="seller_review", to="orders.order")),
            ],
            options={"db_table": "seller_reviews", "ordering": ["-created_at", "-pk"], "abstract": False},
        ),
        migrations.AddConstraint(
            model_name="productreview",
            constraint=models.CheckConstraint(condition=models.Q(("rating__gte", 1), ("rating__lte", 5)), name="prodrev_rating_1_5"),
        ),
        migrations.AddConstraint(
            model_name="productreview",
            constraint=models.CheckConstraint(condition=models.Q(models.Q(("reviewer_type", "user"), ("reviewer_user__isnull", False), ("reviewer_remaker__isnull", True)), models.Q(("reviewer_type", "remaker"), ("reviewer_remaker__isnull", False), ("reviewer_user__isnull", True)), _connector="OR"), name="prodrev_one_reviewer"),
        ),
        migrations.AddConstraint(
            model_name="sellerreview",
            constraint=models.CheckConstraint(condition=models.Q(("rating__gte", 1), ("rating__lte", 5)), name="sellrev_rating_1_5"),
        ),
        migrations.AddConstraint(
            model_name="sellerreview",
            constraint=models.CheckConstraint(condition=models.Q(models.Q(("reviewer_type", "user"), ("reviewer_user__isnull", False), ("reviewer_remaker__isnull", True)), models.Q(("reviewer_type", "remaker"), ("reviewer_remaker__isnull", False), ("reviewer_user__isnull", True)), _connector="OR"), name="sellrev_one_reviewer"),
        ),
        migrations.AddConstraint(
            model_name="sellerreview",
            constraint=models.CheckConstraint(condition=models.Q(models.Q(("seller_type", "user"), ("seller_user__isnull", False), ("seller_remaker__isnull", True)), models.Q(("seller_type", "remaker"), ("seller_remaker__isnull", False), ("seller_user__isnull", True)), _connector="OR"), name="sellrev_one_seller"),
        ),
    ]
