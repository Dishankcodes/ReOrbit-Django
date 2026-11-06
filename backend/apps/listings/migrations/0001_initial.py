import apps.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("admins", "0003_admins_note_admins_phone_admins_role_key"),
        ("core", "0001_initial"),
        ("users", "0002_user_profile_bio_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Item",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=150)),
                ("description", models.TextField()),
                ("condition", models.CharField(choices=[("Excellent", "Excellent"), ("Very Good", "Very Good"), ("Good", "Good"), ("Fair", "Fair")], max_length=12)),
                ("quantity", models.PositiveIntegerField(default=1)),
                ("estimated_price", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("listing_price", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("pickup_preference", models.CharField(choices=[("Seller_Handover", "Seller hands over"), ("Platform_Pickup", "Platform pickup")], max_length=20)),
                ("item_status", models.CharField(choices=[("Draft", "Draft"), ("Listed", "Listed"), ("Reserved", "Reserved"), ("Sold", "Sold"), ("Donated", "Donated"), ("Withdrawn", "Withdrawn"), ("Warehouse", "Warehouse")], default="Draft", max_length=12)),
                ("moderation_status", models.CharField(choices=[("Normal", "Normal"), ("Flagged", "Flagged"), ("Disabled", "Disabled")], default="Normal", max_length=10)),
                ("moderation_note", models.TextField(blank=True)),
                ("moderated_at", models.DateTimeField(blank=True, null=True)),
                ("city", models.CharField(max_length=100)),
                ("pincode", models.CharField(max_length=10)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("category", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="items", to="core.category")),
                ("moderated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.admins")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="items", to="users.users")),
            ],
            options={
                "db_table": "items",
                "ordering": ["-created_at", "-pk"],
            },
        ),
        migrations.CreateModel(
            name="MediaImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to="listings/", validators=[apps.core.validators.validate_image])),
                ("image_type", models.CharField(choices=[("Cover", "Cover"), ("Gallery", "Gallery")], default="Gallery", max_length=30)),
                ("display_order", models.SmallIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("item", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="images", to="listings.item")),
                ("uploaded_by_user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="users.users")),
            ],
            options={
                "db_table": "media_images",
                "ordering": ["display_order", "pk"],
            },
        ),
        migrations.AddIndex(
            model_name="item",
            index=models.Index(fields=["item_status", "moderation_status"], name="items_status_mod_idx"),
        ),
        migrations.AddIndex(
            model_name="item",
            index=models.Index(fields=["user", "item_status"], name="items_user_status_idx"),
        ),
        migrations.AddIndex(
            model_name="item",
            index=models.Index(fields=["category"], name="items_category_idx"),
        ),
        migrations.AddConstraint(
            model_name="item",
            constraint=models.CheckConstraint(condition=models.Q(("quantity__gte", 1)), name="item_quantity_gte_1"),
        ),
        migrations.AddIndex(
            model_name="mediaimage",
            index=models.Index(fields=["item", "display_order"], name="media_item_order_idx"),
        ),
    ]
