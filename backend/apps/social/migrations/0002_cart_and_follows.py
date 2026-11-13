import django.db.models.deletion
from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [
        ("social", "0001_initial"),
        ("users", "0002_user_profile_bio_and_more"),
        ("remakers", "0004_remakerproduct_pickup_preference"),
        ("admins", "0004_adminitem"),
    ]

    operations = [
        migrations.CreateModel(name="Follow", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
            ("follower_type", models.CharField(choices=[("user", "Member"), ("remaker", "ReMaker"), ("admin", "Admin")], max_length=8)),
            ("admin", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="remaker_follows", to="admins.admins")),
            ("remaker", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="remaker_follows", to="remakers.remakers")),
            ("target", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="followers", to="remakers.remakers")),
            ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="remaker_follows", to="users.users")),
        ], options={"db_table": "social_follows", "ordering": ["-created_at", "-id"]}),
        migrations.AddConstraint(model_name="follow", constraint=models.CheckConstraint(condition=Q(follower_type="user", user__isnull=False, remaker__isnull=True, admin__isnull=True) | Q(follower_type="remaker", remaker__isnull=False, user__isnull=True, admin__isnull=True) | Q(follower_type="admin", admin__isnull=False, user__isnull=True, remaker__isnull=True), name="follow_exactly_one_owner")),
        migrations.AddConstraint(model_name="follow", constraint=models.CheckConstraint(condition=~Q(follower_type="remaker", remaker=models.F("target")), name="follow_no_self")),
        migrations.AddConstraint(model_name="follow", constraint=models.UniqueConstraint(condition=Q(user__isnull=False), fields=("user", "target"), name="follow_unique_user_target")),
        migrations.AddConstraint(model_name="follow", constraint=models.UniqueConstraint(condition=Q(remaker__isnull=False), fields=("remaker", "target"), name="follow_unique_remaker_target")),
        migrations.AddConstraint(model_name="follow", constraint=models.UniqueConstraint(condition=Q(admin__isnull=False), fields=("admin", "target"), name="follow_unique_admin_target")),
        migrations.CreateModel(name="Cart", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
            ("actor_type", models.CharField(choices=[("user", "Member"), ("remaker", "ReMaker"), ("admin", "Admin")], max_length=8)),
            ("admin", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="carts", to="admins.admins")),
            ("remaker", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="carts", to="remakers.remakers")),
            ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="carts", to="users.users")),
        ], options={"db_table": "shopping_carts"}),
        migrations.AddConstraint(model_name="cart", constraint=models.CheckConstraint(condition=Q(actor_type="user", user__isnull=False, remaker__isnull=True, admin__isnull=True) | Q(actor_type="remaker", remaker__isnull=False, user__isnull=True, admin__isnull=True) | Q(actor_type="admin", admin__isnull=False, user__isnull=True, remaker__isnull=True), name="cart_exactly_one_owner")),
        migrations.AddConstraint(model_name="cart", constraint=models.UniqueConstraint(condition=Q(user__isnull=False), fields=("user",), name="cart_one_per_user")),
        migrations.AddConstraint(model_name="cart", constraint=models.UniqueConstraint(condition=Q(remaker__isnull=False), fields=("remaker",), name="cart_one_per_remaker")),
        migrations.AddConstraint(model_name="cart", constraint=models.UniqueConstraint(condition=Q(admin__isnull=False), fields=("admin",), name="cart_one_per_admin")),
        migrations.CreateModel(name="CartLine", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
            ("item_ref", models.CharField(max_length=24)), ("quantity", models.PositiveSmallIntegerField()),
            ("cart", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lines", to="social.cart")),
        ], options={"db_table": "shopping_cart_lines"}),
        migrations.AddConstraint(model_name="cartline", constraint=models.UniqueConstraint(fields=("cart", "item_ref"), name="cart_line_unique_item")),
        migrations.AddConstraint(model_name="cartline", constraint=models.CheckConstraint(condition=Q(quantity__gte=1, quantity__lte=99), name="cart_line_quantity_range")),
    ]
