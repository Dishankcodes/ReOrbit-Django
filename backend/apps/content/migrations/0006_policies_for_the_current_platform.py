"""Policies rewritten for how ReOrbit works today (version 2.0).

For each policy:
- still the first text from 0002 (nobody edited it): version 2.0 is published, with the old text kept
  in its history;
- edited by the team: version 2.0 is saved as a draft to compare and publish from Admin › Content ›
  Policies (what is live stays as it is);
- never published (Community guidelines): published as version 1.0.
Values in {braces} follow Admin › Settings.
"""

from django.db import migrations
from django.utils import timezone

TEXTS = {
    "terms": """## 1. What ReOrbit is
ReOrbit is a marketplace for things that deserve a second life. Members sell pre-loved items, ReMakers sell pieces they upcycled, restored or made by hand, and ReOrbit sells checked stock from its own warehouse. You can also donate things you no longer need.

## 2. Your account
You must be 18 or older, or use ReOrbit with a parent or guardian, and give true details when you sign up. Keep your password private: after 5 wrong attempts, sign-in pauses for a few minutes. Changing your password signs you out on every other device. You can delete your account from Settings and come back by signing in again within 30 days.

## 3. Listing and selling
Describe items honestly and show real photos of the actual item, including any wear or damage. A listing goes live as soon as you publish it. ReOrbit may flag a listing that needs fixing, suggest a better price, or turn off a listing that breaks these terms; you always see the reason.

## 4. Buying
Prices are in rupees. Orders placed by members and ReMakers carry a platform fee of {platform_fee}, shown at checkout before you pay. You can pay online or, for orders up to {cod_limit}, with cash on delivery (at most two unpaid cash orders at a time).

## 5. Delivery
The seller either hands the parcel to the courier, or chooses "Managed by ReOrbit": then ReOrbit collects it once the order is packed and delivers it, and the buyer pays ReOrbit's delivery fee. Delivery on ReOrbit store products is free from {free_delivery_from}.

## 6. Payouts to sellers
Sellers are paid once the order is delivered and the return window has closed. Changing payout details needs a code sent to your email, and payouts pause for 24 hours after a change to keep your money safe.

## 7. Orbit Points and vouchers
You earn Orbit Points for donations, purchases and listings, and can turn them into vouchers. Points for cash-on-delivery orders arrive once the cash is confirmed, and points for a listing are taken back if it is deleted within 7 days. Vouchers have no cash value.

## 8. Accounts that break the rules
We may warn, suspend or block an account for scams, fake listings or reviews, abuse or repeated breaches. You are told why and can contact support to appeal.

## 9. Changes
When these terms change, the version and date at the top change, and important changes are announced in the app.""",

    "privacy": """## What we collect
Your name, email and phone number; the addresses you save for pickups and deliveries; your profile photo and bio if you add them; the items you list, buy, sell, donate and review; your messages and support tickets; and basic technical data (such as your IP address and the time you last used the app) that keeps your account secure.

## How we use it
To run your account, show your listings, arrange pickups and deliveries, take payments and pay sellers, give Orbit Points and certificates, answer support requests, prevent fraud and send the emails and notifications you asked for.

## Who sees what
Other people see your public profile: your name, city, photo, listings and reviews. Your address and phone number go only to the courier or pickup team handling your order or donation. ReOrbit's team sees what it needs to help you and to keep the marketplace safe, for example whether you used the app recently.

## Services we use
Payments are handled by our payment provider; we never see or store your full card details. Emails are sent through an email service, and photos are stored with a cloud storage provider. They only use your data to provide that service to us.

## Security
Passwords are stored in a form that can't be read back. Sign-in pauses after repeated wrong attempts, payout detail changes need an email code, and you can turn on sign-in alerts in Settings.

## Your choices
You can edit your details, turn notifications on or off, and delete your account from Settings. A deleted account can come back within 30 days; after that it is removed, except records the law asks us to keep, such as paid orders.

## Contact
Questions about your data: write to us from Help › Contact support.""",

    "refunds": """## Returns
If an item arrives damaged or different from its description, ask for a return from My orders within 7 days of delivery, with photos. The seller or ReOrbit reviews it and, once approved, the item is sent back.

## Item never arrived
Choose "I never received it". There is nothing to send back, so the refund starts as soon as the request is approved.

## Refunds
The money goes back to the way you paid. For cash-on-delivery orders it goes to the bank account or UPI you give us. The platform fee of {platform_fee} is refunded too when the problem was the seller's or ours.

## Cancelling
You can cancel an order before it ships. Online payments are refunded automatically.

## What can't be returned
Items damaged after delivery, items that matched their honest description, and requests made after the 7-day window.""",

    "shipping": """## How orders travel
Each seller ships their own items. Orders from different sellers become separate orders, each with its own tracking.

## Delivery methods
- Courier handover: the seller packs the item and hands it to the courier.
- Managed by ReOrbit: once the seller has packed the order, ReOrbit collects it and delivers it. The buyer pays ReOrbit's delivery fee.
- ReOrbit store: ReOrbit packs and ships from its warehouse. Delivery is free from {free_delivery_from}.

## Times
Sellers pack within 2 working days. Delivery usually takes 3 to 7 working days, depending on where you live.

## Cash on delivery
Available for orders up to {cod_limit}, with at most two unpaid cash orders at a time. Keep the exact amount ready.

## Tracking
You get a notification when your order is confirmed, packed, shipped and delivered, and can follow it from My orders.""",

    "donation": """## What we accept
Furniture, home decor, kitchenware, clothing, books, working electronics and sports goods, clean and in usable condition.

## What we can't take
Broken or unsafe electrical items, mattresses, damaged upholstery, and anything dangerous or illegal.

## How it works
Send photos and details from Donations. The team checks your donation; once it is accepted, a free pickup is scheduled at your door. Share the 4-digit code you see in the app with the pickup team: that confirms the handover.

## Your reward
You earn Orbit Points for every completed donation (up to 5,000 points for one donation) and a donation certificate.

## What happens next
Donated items go to the ReOrbit warehouse. Items in good shape are checked and sold in the ReOrbit store or restored by a ReMaker, and anything we can't sell is passed on to partner NGOs.""",

    "community": """## Be honest
Show real photos of the actual item, describe every flaw, and never ask for payment outside ReOrbit.

## Be respectful
No abuse, threats, harassment or hate in messages, listings or reviews. A first problem means a warning; repeated problems lead to suspension or a block.

## Fair reviews
Review what you really bought, once per order. Every member and ReMaker can rate ReOrbit itself once, and edit that rating any time. Fake or paid reviews are removed.

## Respect creators
Don't copy another ReMaker's work, and don't sell counterfeit, stolen or banned items.

## Report problems
Use the Report button on any listing, review or profile. A person on our team reads every report, and you can follow its answer under My reports.""",
}

NOTE = "Updated for how ReOrbit works today"


def update(apps, schema_editor):
    Policy = apps.get_model("content", "Policy")
    Version = apps.get_model("content", "PolicyVersion")
    now = timezone.now()
    for key, text in TEXTS.items():
        p = Policy.objects.filter(key=key).first()
        if p is None:
            continue
        untouched = p.body and p.body == p.starter_body and p.version in ("", "1.0")
        never_published = not p.body and not p.has_draft
        if untouched or never_published:
            version = "2.0" if untouched else "1.0"
            if Version.objects.filter(policy=p, version=version).exists():
                continue
            p.body, p.version, p.published_at, p.published_by = text, version, now, "ReOrbit team"
            p.starter_body = text
            p.save(update_fields=["body", "version", "published_at", "published_by", "starter_body", "updated_at"])
            Version.objects.create(policy=p, version=version, body=text, note=NOTE, by_name="ReOrbit team")
        elif not p.has_draft:
            p.draft_body, p.draft_note, p.draft_at, p.draft_by, p.has_draft = text, NOTE, now, "ReOrbit team", True
            p.save(update_fields=["draft_body", "draft_note", "draft_at", "draft_by", "has_draft", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [("content", "0005_banner_side")]
    operations = [migrations.RunPython(update, migrations.RunPython.noop)]
