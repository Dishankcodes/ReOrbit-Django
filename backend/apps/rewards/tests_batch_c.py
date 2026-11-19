from datetime import timedelta

from django.utils import timezone

from apps.core.testing import APIBase
from apps.rewards import services
from apps.rewards.models import PointsEntry


class ListingPointsTests(APIBase):
    def _item(self, user, pid="ITM-9001"):
        class Item:  # only what the hook reads
            public_id = pid
            title = "Teak chair"
        return Item()

    def test_deleted_soon_after_gives_the_points_back(self):
        user = self.make_user()
        item = self._item(user)
        services.award(user, "listing", 10, "Item listed", item.title, "listing", item.public_id)
        taken = services.on_listing_deleted(user, item)
        self.assertEqual(taken.points, -10)
        self.assertEqual(sum(PointsEntry.objects.filter(user=user).values_list("points", flat=True)), 0)
        self.assertIsNone(services.on_listing_deleted(user, item))  # only once

    def test_old_listings_keep_their_points(self):
        user = self.make_user()
        item = self._item(user, "ITM-9002")
        e = services.award(user, "listing", 10, "Item listed", item.title, "listing", item.public_id)
        PointsEntry.objects.filter(pk=e.pk).update(created_at=timezone.now() - timedelta(days=8))
        self.assertIsNone(services.on_listing_deleted(user, item))


class DonationPointsCapTests(APIBase):
    def test_admin_cannot_give_more_than_the_cap(self):
        from apps.donations.services import MAX_DONATION_POINTS, _reward_choice

        with self.assertRaises(Exception) as ctx:
            _reward_choice({"points": str(MAX_DONATION_POINTS + 1)})
        self.assertIn("at most", str(getattr(ctx.exception, "errors", ctx.exception)) + str(ctx.exception))
        self.assertEqual(_reward_choice({"points": "200"})[0], 200)
