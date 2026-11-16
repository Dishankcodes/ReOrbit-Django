import django.db.models.deletion
from django.db import migrations, models


def _constraint(prefix):
    Q = models.Q
    return models.CheckConstraint(
        condition=(
            Q(reviewer_type="user", reviewer_user__isnull=False, reviewer_remaker__isnull=True, reviewer_admin__isnull=True)
            | Q(reviewer_type="remaker", reviewer_remaker__isnull=False, reviewer_user__isnull=True, reviewer_admin__isnull=True)
            | Q(reviewer_type="admin", reviewer_admin__isnull=False, reviewer_user__isnull=True, reviewer_remaker__isnull=True)
        ),
        name=f"{prefix}_one_reviewer",
    )


def _old_constraint(prefix):
    Q = models.Q
    return models.CheckConstraint(
        condition=(
            Q(reviewer_type="user", reviewer_user__isnull=False, reviewer_remaker__isnull=True)
            | Q(reviewer_type="remaker", reviewer_remaker__isnull=False, reviewer_user__isnull=True)
        ),
        name=f"{prefix}_one_reviewer",
    )


class Migration(migrations.Migration):
    """A ReOrbit admin who shops as the platform can rate their own delivered orders."""

    dependencies = [
        ("admins", "0007_alter_adminitem_condition_alter_adminitem_mrp"),
        ("reviews", "0004_remove_reviewreport_revreport_one_reporter_and_more"),
    ]

    operations = [
        migrations.RemoveConstraint(model_name="productreview", name="prodrev_one_reviewer"),
        migrations.RemoveConstraint(model_name="sellerreview", name="sellrev_one_reviewer"),
        migrations.AddField(
            model_name="productreview",
            name="reviewer_admin",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="+", to="admins.admins"),
        ),
        migrations.AddField(
            model_name="sellerreview",
            name="reviewer_admin",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="+", to="admins.admins"),
        ),
        migrations.AddConstraint(model_name="productreview", constraint=_constraint("prodrev")),
        migrations.AddConstraint(model_name="sellerreview", constraint=_constraint("sellrev")),
    ]
