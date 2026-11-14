"""The six policies every marketplace needs, with a sensible first text the team can edit.
Five start published (version 1.0); Community guidelines starts as an unpublished draft."""

from django.db import migrations
from django.utils import timezone

BODIES = {
    "TERMS": "## 1. Using ReOrbit\nReOrbit is a marketplace for second-life goods. You must be 18 or older, or use the service with a parent or guardian, and give true information when you sign up.\n\n## 2. Listing and buying\nDescribe items honestly and show their real condition. Listings go live as soon as you publish them. We may turn off or remove a listing that breaks these terms.\n\n## 3. Fees\nOrders placed by members carry a platform fee of {platform_fee}, shown at checkout before you pay. Platform products over {free_delivery_from} ship free.\n\n## 4. Accounts\nYou are responsible for what happens on your account. We may warn, suspend or block accounts for scams, abuse or repeated policy breaches.\n\n## 5. Changes\nWe may update these terms. When we do, the version and date at the top change, and important changes are announced in the app.",
    "PRIVACY": "## What we collect\nYour name, email, phone number, address for pickups and delivery, the items you list or buy, and basic usage data that helps us fix problems.\n\n## How we use it\nTo run your account, arrange pickups and deliveries, process payments, prevent fraud and send updates about your orders and donations.\n\n## Who sees it\nYour public profile shows your name, city and listings. Your address and phone number are shared only with the pickup team or courier handling your order.\n\n## Your choices\nYou can edit your details, download your data or ask us to delete your account from Settings. Some records, such as paid orders, are kept as the law requires.",
    "REFUNDS": "## Returns\nIf an item arrives different from its description, tell us within 7 days of delivery and we will arrange a return.\n\n## Refunds\nOnce the return is received and checked, the money goes back to the original payment method. Cash on delivery orders are refunded to your Orbit wallet or bank account.\n\n## Not eligible\nItems damaged after delivery, items that were described honestly, and orders cancelled after they were shipped.\n\n## Platform fee\nThe platform fee of {platform_fee} is refunded together with the item when the problem was ours or the seller's.",
    "SHIPPING": "## Delivery\nOrders are packed within 2 working days and delivered in 3 to 7 working days, depending on where you live.\n\n## Delivery fee\nDelivery on platform products is free from {free_delivery_from}. Below that, the fee is shown at checkout.\n\n## Cash on delivery\nAvailable for orders up to {cod_limit}. Keep the exact amount ready when the courier arrives.\n\n## Tracking\nYou will get an update when your order is confirmed, shipped and delivered, and you can follow it from My orders.",
    "DONATION": "## What we accept\nFurniture, home decor, kitchenware, clothing, books, electronics that work and sports goods, in a usable condition.\n\n## What we cannot take\nBroken or unsafe electrical items, mattresses, damaged upholstery and anything dangerous or illegal.\n\n## Free pickup\nOnce we accept your donation, a pickup team collects it from your door at no cost. Please keep the item ready in your chosen slot.\n\n## Your reward\nYou earn Orbit Points for every completed donation and receive a donation certificate. Items we cannot sell are passed on to partner NGOs.",
    "COMMUNITY": "## Be honest\nShow real photos, describe flaws and never ask for payment outside ReOrbit.\n\n## Be respectful\nAbuse, threats and harassment lead to a warning, and repeated problems to suspension.\n\n## Respect creators\nDo not copy another ReMaker's work or sell counterfeit items.\n\n## Report problems\nUse the report button on any listing, review or profile. Every report is read by a person on our team."
}

POLICIES = [
    ("terms", "Terms of use", "Scale", "The rules for using ReOrbit.", "TERMS", True),
    ("privacy", "Privacy policy", "Lock", "What we collect and why.", "PRIVACY", True),
    ("refunds", "Returns and refunds", "RotateCcw", "When and how we give money back.", "REFUNDS", True),
    ("shipping", "Shipping and delivery", "Truck", "How orders reach you.", "SHIPPING", True),
    ("donation", "Donation guidelines", "Gift", "What we accept and how pickups work.", "DONATION", True),
    ("community", "Community guidelines", "UsersRound", "How we expect everyone to behave.", "COMMUNITY", False),
]


def seed(apps, schema_editor):
    Policy = apps.get_model("content", "Policy")
    Version = apps.get_model("content", "PolicyVersion")
    now = timezone.now()
    for order, (key, title, icon, summary, body_key, live) in enumerate(POLICIES, start=1):
        body = BODIES[body_key]
        p = Policy.objects.create(
            key=key, title=title, icon=icon, summary=summary, sort_order=order,
            starter_body=body,
            body=body if live else "", version="1.0" if live else "",
            published_at=now if live else None, published_by="ReOrbit team" if live else "",
        )
        if live:
            Version.objects.create(policy=p, version="1.0", body=body, note="First version", by_name="ReOrbit team")


def unseed(apps, schema_editor):
    apps.get_model("content", "Policy").objects.filter(key__in=[p[0] for p in POLICIES]).delete()


class Migration(migrations.Migration):
    dependencies = [("content", "0001_initial")]
    operations = [migrations.RunPython(seed, unseed)]
