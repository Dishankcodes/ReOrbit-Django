from django.db import migrations, models


def forwards(apps, schema_editor):
    # "ReMakers" used to mean "needs a ReMaker product"; it now means any ReMaker account may use it
    RewardOffer = apps.get_model("rewards", "RewardOffer")
    RewardOffer.objects.filter(remaker_only=True).update(audience="remakers", min_level=0)


def backwards(apps, schema_editor):
    RewardOffer = apps.get_model("rewards", "RewardOffer")
    RewardOffer.objects.filter(audience="remakers").update(remaker_only=True, audience="all")
    RewardOffer.objects.filter(audience="members").update(audience="all")


class Migration(migrations.Migration):
    dependencies = [("rewards", "0006_voucher_owner_remaker")]

    operations = [
        migrations.AlterField("rewardoffer", "audience", models.CharField(default="all", max_length=8)),
        migrations.AddField("rewardoffer", "applies_to", models.CharField(default="any", max_length=8)),
        migrations.RunPython(forwards, backwards),
        migrations.RemoveField("rewardoffer", "remaker_only"),
    ]
