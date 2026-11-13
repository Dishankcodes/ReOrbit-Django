from datetime import timedelta

from django.db import migrations
from django.utils import timezone

RULES = [
    ("purchase", "Buying", "Marketplace purchase", "Points for every ₹100 spent on a delivered order.", 10, "per ₹100 spent", True),
    ("firstOrder", "Buying", "First order bonus", "A welcome bonus on a member's first delivered order.", 50, "one time", True),
    ("donationBase", "Donating", "Donation received", "Credited when ReOrbit receives the donation at the warehouse.", 100, "per donation", True),
    ("donationItem", "Donating", "Extra for every item donated", "Added on top, for each item in the donation.", 20, "per item", True),
    ("listing", "Community", "Item listed", "When a member publishes an item for sale (once per item).", 30, "per item", True),
    ("review", "Community", "Write a review", "For each product review.", 20, "per review", True),
    ("referral", "Community", "Refer a friend", "When a friend you invited completes a first order.", 150, "per friend", False),
    ("follow", "Community", "Follow a ReMaker", "Small reward for following, up to 10 ReMakers.", 5, "per follow", False),
]
OFFERS = [
    # code, title, description, kind, type, value, min_order, max_discount, cost, limit, per_user, audience, level
    ("ORBIT100", "₹100 Marketplace Voucher", "Save on your next sustainable purchase.", "points", "fixed", 100, 499, 100, 500, 500, 3, "all", 0),
    ("ORBIT250", "₹250 Sustainability Voucher", "For members who have reached the Orbiter level.", "points", "fixed", 250, 999, 250, 1200, 200, 2, "all", 2),
    ("WELCOME10", "10% off your first order", "A welcome coupon for new members.", "code", "percent", 10, 399, 150, 0, 1000, 1, "new", 0),
]


def seed(apps, schema_editor):
    Rule, Offer = apps.get_model("rewards", "RewardRule"), apps.get_model("rewards", "RewardOffer")
    for key, group, title, desc, pts, unit, active in RULES:
        Rule.objects.get_or_create(key=key, defaults=dict(group=group, title=title, description=desc, points=pts, unit=unit, active=active))
    today = timezone.localdate()
    for code, title, desc, kind, dtype, value, min_order, cap, cost, limit, per_user, aud, level in OFFERS:
        if Offer.objects.filter(code=code).exists():
            continue
        offer = Offer(code=code, title=title, description=desc, kind=kind, discount_type=dtype, value=value, min_order=min_order,
                      max_discount=cap, points_cost=cost, usage_limit=limit, per_user=per_user, audience=aud, min_level=level,
                      valid_from=today, valid_to=today + timedelta(days=365))
        offer.save()
        # historic models do not run PublicIdModel.save(): give it its id by hand
        Sequence = apps.get_model("core", "PublicIdSequence")
        seq, _ = Sequence.objects.get_or_create(prefix="RWD")
        seq.last_value += 1
        seq.save()
        offer.public_id = f"RWD-{seq.last_value}"
        offer.save(update_fields=["public_id"])


class Migration(migrations.Migration):
    dependencies = [("rewards", "0002_rewards_system"), ("core", "0003_savedaddress_admin")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
