import django.db.models.deletion
from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("users", "0002_user_profile_bio_and_more"),
        ("remakers", "0004_remakerproduct_pickup_preference"),
        ("admins", "0004_adminitem"),
    ]

    operations = [
        migrations.CreateModel(
            name="WishlistEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("actor_type", models.CharField(choices=[("user", "Member"), ("remaker", "ReMaker"), ("admin", "Admin")], max_length=8)),
                ("item_kind", models.CharField(max_length=8)),
                ("item_ref", models.CharField(max_length=24)),
                ("admin", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="wishlist_entries", to="admins.admins")),
                ("remaker", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="wishlist_entries", to="remakers.remakers")),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="wishlist_entries", to="users.users")),
            ],
            options={"db_table": "wishlist_entries", "ordering": ["-created_at", "-id"]},
        ),
        migrations.AddConstraint(
            model_name="wishlistentry",
            constraint=models.CheckConstraint(
                condition=(
                    Q(actor_type="user", user__isnull=False, remaker__isnull=True, admin__isnull=True)
                    | Q(actor_type="remaker", remaker__isnull=False, user__isnull=True, admin__isnull=True)
                    | Q(actor_type="admin", admin__isnull=False, user__isnull=True, remaker__isnull=True)
                ),
                name="wishlist_exactly_one_owner",
            ),
        ),
        migrations.AddConstraint(
            model_name="wishlistentry",
            constraint=models.UniqueConstraint(fields=("user", "item_ref"), condition=Q(user__isnull=False), name="wishlist_unique_user_item"),
        ),
        migrations.AddConstraint(
            model_name="wishlistentry",
            constraint=models.UniqueConstraint(fields=("remaker", "item_ref"), condition=Q(remaker__isnull=False), name="wishlist_unique_remaker_item"),
        ),
        migrations.AddConstraint(
            model_name="wishlistentry",
            constraint=models.UniqueConstraint(fields=("admin", "item_ref"), condition=Q(admin__isnull=False), name="wishlist_unique_admin_item"),
        ),
    ]
