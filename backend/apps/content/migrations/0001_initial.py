import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("admins", "0005_adminitem_sell_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="Banner",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=60)),
                ("subtitle", models.CharField(blank=True, max_length=110)),
                ("cta", models.CharField(blank=True, max_length=20)),
                ("link", models.CharField(blank=True, max_length=300)),
                ("placement", models.CharField(max_length=20)),
                ("audience", models.CharField(default="Everyone", max_length=20)),
                ("image", models.CharField(max_length=500)),
                ("start", models.DateField(blank=True, null=True)),
                ("end", models.DateField(blank=True, null=True)),
                ("active", models.BooleanField(default=False)),
                ("position", models.PositiveIntegerField(default=0)),
                ("views", models.PositiveBigIntegerField(default=0)),
                ("clicks", models.PositiveBigIntegerField(default=0)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.admins")),
            ],
            options={"db_table": "banners", "ordering": ["placement", "position", "id"]},
        ),
        migrations.CreateModel(
            name="Faq",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("topic", models.CharField(max_length=30)),
                ("question", models.CharField(max_length=200)),
                ("answer", models.TextField()),
                ("published", models.BooleanField(default=True)),
                ("position", models.PositiveIntegerField(default=0)),
                ("helpful", models.PositiveIntegerField(default=0)),
                ("not_helpful", models.PositiveIntegerField(default=0)),
            ],
            options={"db_table": "faqs", "ordering": ["position", "id"]},
        ),
        migrations.CreateModel(
            name="Policy",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("key", models.SlugField(max_length=30, unique=True)),
                ("title", models.CharField(max_length=80)),
                ("icon", models.CharField(default="ScrollText", max_length=20)),
                ("summary", models.CharField(blank=True, max_length=160)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("body", models.TextField(blank=True)),
                ("version", models.CharField(blank=True, max_length=10)),
                ("published_at", models.DateTimeField(blank=True, null=True)),
                ("published_by", models.CharField(blank=True, max_length=150)),
                ("draft_body", models.TextField(blank=True)),
                ("draft_note", models.CharField(blank=True, max_length=200)),
                ("draft_at", models.DateTimeField(blank=True, null=True)),
                ("draft_by", models.CharField(blank=True, max_length=150)),
                ("has_draft", models.BooleanField(default=False)),
                ("starter_body", models.TextField(blank=True)),
            ],
            options={"db_table": "policies", "ordering": ["sort_order", "id"]},
        ),
        migrations.CreateModel(
            name="ContentLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("by_name", models.CharField(max_length=150)),
                ("text", models.CharField(max_length=300)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "content_log", "ordering": ["-created_at", "-id"]},
        ),
        migrations.CreateModel(
            name="PolicyVersion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("version", models.CharField(max_length=10)),
                ("body", models.TextField()),
                ("note", models.CharField(blank=True, max_length=200)),
                ("by_name", models.CharField(blank=True, max_length=150)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("policy", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="versions", to="content.policy")),
            ],
            options={"db_table": "policy_versions", "ordering": ["-created_at", "-id"]},
        ),
        migrations.AddConstraint(
            model_name="policyversion",
            constraint=models.UniqueConstraint(fields=("policy", "version"), name="policy_version_once"),
        ),
    ]
