import django.db.models.deletion
from django.db import migrations, models
from django.db.models import Q

TARGET_FKS = (
    "target_user", "target_remaker", "target_item", "target_remaker_product",
    "target_admin_item", "target_product_review", "target_seller_review",
)


def _only(*names):
    q = Q()
    for n in TARGET_FKS:
        q &= Q(**{f"{n}__isnull": n not in names})
    return q


def fk(to, name_related="+", **kw):
    return models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name=name_related, to=to,
                             null=True, blank=True, **kw)


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("admins", "0007_alter_adminitem_condition_alter_adminitem_mrp"),
        ("listings", "0007_item_price_suggestion"),
        ("remakers", "0004_remakerproduct_pickup_preference"),
        ("reviews", "0004_remove_reviewreport_revreport_one_reporter_and_more"),
        ("users", "0002_user_profile_bio_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Complaint",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("target_type", models.CharField(choices=[("User", "User"), ("ReMaker", "ReMaker"), ("Product", "Product"), ("Review", "Review")], max_length=8)),
                ("category", models.CharField(max_length=60)),
                ("description", models.CharField(max_length=1000)),
                ("status", models.CharField(choices=[("Open", "Open"), ("Under_Review", "Under review"), ("Resolved", "Resolved"), ("Dismissed", "Dismissed")], default="Open", max_length=14)),
                ("source", models.CharField(choices=[("member", "Filed by a member"), ("admin", "Logged by the team")], default="member", max_length=8)),
                ("reporter_name", models.CharField(max_length=150)),
                ("reporter_role", models.CharField(default="Staff", max_length=10)),
                ("resolution_action", models.CharField(blank=True, max_length=20)),
                ("resolution_note", models.CharField(blank=True, max_length=1000)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("target_user", fk("users.users")),
                ("target_remaker", fk("remakers.remakers")),
                ("target_item", fk("listings.item")),
                ("target_remaker_product", fk("remakers.remakerproduct")),
                ("target_admin_item", fk("admins.adminitem")),
                ("target_product_review", fk("reviews.productreview")),
                ("target_seller_review", fk("reviews.sellerreview")),
                ("reporter_user", fk("users.users")),
                ("reporter_remaker", fk("remakers.remakers")),
                ("logged_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.admins")),
                ("assignee", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.admins")),
                ("resolved_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.admins")),
            ],
            options={"db_table": "complaints", "ordering": ["-created_at", "-pk"]},
        ),
        migrations.AddIndex(model_name="complaint", index=models.Index(fields=["status", "created_at"], name="cmp_status_created_idx")),
        migrations.AddIndex(model_name="complaint", index=models.Index(fields=["assignee", "status"], name="cmp_assignee_status_idx")),
        migrations.AddIndex(model_name="complaint", index=models.Index(fields=["target_type", "status"], name="cmp_type_status_idx")),
        migrations.AddConstraint(
            model_name="complaint",
            constraint=models.CheckConstraint(
                name="cmp_target_matches_type",
                condition=(
                    Q(target_type="User") & _only("target_user")
                    | Q(target_type="ReMaker") & _only("target_remaker")
                    | Q(target_type="Product") & (
                        _only("target_item") | _only("target_remaker_product") | _only("target_admin_item"))
                    | Q(target_type="Review") & (_only("target_product_review") | _only("target_seller_review"))
                ),
            ),
        ),
        migrations.AddConstraint(
            model_name="complaint",
            constraint=models.CheckConstraint(
                name="cmp_reporter_matches_source",
                condition=(
                    Q(source="member", logged_by__isnull=True)
                    & (Q(reporter_user__isnull=False, reporter_remaker__isnull=True)
                       | Q(reporter_user__isnull=True, reporter_remaker__isnull=False))
                    | Q(source="admin", reporter_user__isnull=True, reporter_remaker__isnull=True)
                ),
            ),
        ),
        migrations.CreateModel(
            name="ComplaintEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("label", models.CharField(max_length=60)),
                ("detail", models.CharField(blank=True, max_length=1000)),
                ("tone", models.CharField(choices=[("good", "Good"), ("info", "Info"), ("wait", "Waiting"), ("bad", "Bad"), ("neutral", "Neutral")], default="neutral", max_length=8)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("complaint", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="complaints.complaint")),
            ],
            options={"db_table": "complaint_events", "ordering": ["created_at", "pk"]},
        ),
        migrations.CreateModel(
            name="ComplaintNote",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("author_name", models.CharField(max_length=150)),
                ("text", models.CharField(max_length=2000)),
                ("author", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.admins")),
                ("complaint", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notes", to="complaints.complaint")),
            ],
            options={"db_table": "complaint_notes", "ordering": ["created_at", "pk"]},
        ),
        migrations.CreateModel(
            name="ComplaintWarning",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("sent_by_name", models.CharField(max_length=150)),
                ("message", models.CharField(max_length=1000)),
                ("complaint", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="warnings", to="complaints.complaint")),
                ("sent_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.admins")),
            ],
            options={"db_table": "complaint_warnings", "ordering": ["created_at", "pk"]},
        ),
    ]
