from apps.accounts.permissions import SAFE_METHODS  # noqa: F401  (import check only)
from apps.admins.models import Admins
from apps.core.models import AuditLog, Category, PlatformSettings
from apps.core.pricing import cod_block_reason, delivery_charge, maintenance_block_reason, platform_fee
from apps.core.testing import APIBase
from apps.donations import services as donation_services
from apps.listings.models import Item
from apps.orders import services as order_services

URL = "/api/platform/admin/settings/"
PUBLIC = "/api/core/settings/"


class SettingsBase(APIBase):
    def setUp(self):
        super().setUp()
        self.admin = self.make_admin(modules={"settings": "edit"})
        self.user = self.make_user("member@example.com")

    def save(self, body, as_=None):
        return self.patch(URL, body, as_=as_ or self.admin)

    def rules(self):
        return self.client.get(PUBLIC).data["data"]


class AccessTests(SettingsBase):
    def test_read_and_write_need_the_settings_module(self):
        viewer = self.make_admin(email="v@example.com", modules={"settings": "view"})
        nobody = self.make_admin(email="n@example.com", modules={"orders": "edit"})
        self.assertEqual(self.get(URL, as_=viewer).status_code, 200)
        self.assertEqual(self.save({"commerce": {"codLimit": 100}}, as_=viewer).status_code, 403)
        self.assertEqual(self.get(URL, as_=nobody).status_code, 403)
        self.assertEqual(self.save({"commerce": {"codLimit": 100}}, as_=nobody).status_code, 403)

    def test_super_admin_passes(self):
        boss = self.make_admin(email="s@example.com", permission_level=Admins.PermissionLevel.SUPER_ADMIN)
        self.assertEqual(self.save({"commerce": {"codLimit": 500}}, as_=boss).status_code, 200)

    def test_members_and_visitors_are_refused(self):
        self.assertEqual(self.get(URL, as_=self.user).status_code, 403)
        self.assertEqual(self.save({"commerce": {"codLimit": 1}}, as_=self.user).status_code, 403)
        self.assertEqual(self.client.get(URL).status_code, 401)

    def test_the_public_read_needs_no_login(self):
        self.assertEqual(self.client.get(PUBLIC).status_code, 200)


class ReadTests(SettingsBase):
    def test_defaults_match_the_admin_screen(self):
        data = self.get(URL, as_=self.admin).data["data"]
        self.assertEqual(data["commerce"], {
            "platformFeePct": 3.0, "productDelivery": 79, "freeDeliveryFrom": 1500,
            "itemDelivery": 149, "sellDelivery": 149, "sellFreeFrom": 5000,
            "codEnabled": True, "codLimit": 20000, "maxListingsPerDay": 5,
        })
        self.assertEqual(data["warehouse"], {
            "unsoldDays": 7, "slowDays": 14, "deadDays": 30, "autoPriceCut": False, "priceCutPct": 15})
        self.assertEqual(data["platform"], {
            "maintenance": False, "supportEmail": "support@reorbit.in",
            "minDonationItems": 1, "sessionMinutes": 60})
        self.assertEqual(data["notifications"]["channels"], {"email": True, "push": True, "digest": False})
        self.assertEqual(data["log"], [])


class SaveTests(SettingsBase):
    def test_commerce_saves_and_reaches_the_public_rules(self):
        r = self.save({"commerce": {
            "platformFeePct": 5.5, "productDelivery": 99, "freeDeliveryFrom": 2000, "itemDelivery": 199,
            "sellDelivery": 120, "sellFreeFrom": 4000, "codEnabled": False, "codLimit": 9000,
            "maxListingsPerDay": 8}})
        self.assertEqual(r.status_code, 200, r.data)
        s = PlatformSettings.load()
        self.assertEqual(float(s.platform_fee_pct), 5.5)
        self.assertEqual((s.product_delivery, s.free_delivery_from, s.item_delivery), (99, 2000, 199))
        self.assertEqual((s.admin_item_delivery, s.admin_item_free_from), (120, 4000))
        self.assertEqual((s.cod_enabled, s.cod_limit, s.max_listings_per_day), (False, 9000, 8))
        rules = self.rules()
        self.assertEqual(rules["platformFeePct"], 5.5)
        self.assertEqual((rules["productDelivery"], rules["freeDeliveryFrom"]), (99, 2000))
        self.assertEqual((rules["sellDelivery"], rules["sellFreeFrom"]), (120, 4000))
        self.assertFalse(rules["codEnabled"])
        self.assertEqual(rules["maxListingsPerDay"], 8)

    def test_partial_save_keeps_the_rest(self):
        self.save({"commerce": {"codLimit": 7000}})
        s = PlatformSettings.load()
        self.assertEqual(s.cod_limit, 7000)
        self.assertEqual(s.product_delivery, 79)
        self.assertEqual(float(s.platform_fee_pct), 3.0)

    def test_numbers_may_arrive_as_text(self):
        self.assertEqual(self.save({"commerce": {"codLimit": "12000", "platformFeePct": "4"}}).status_code, 200)
        self.assertEqual(PlatformSettings.load().cod_limit, 12000)

    def test_warehouse_platform_and_notifications_save(self):
        r = self.save({
            "warehouse": {"unsoldDays": 10, "slowDays": 20, "deadDays": 40, "autoPriceCut": True, "priceCutPct": 25},
            "platform": {"maintenance": False, "supportEmail": "help@reorbit.in",
                         "minDonationItems": 3, "sessionMinutes": 30},
            "notifications": {"quietHours": True, "channels": {"digest": True}, "modules": {"Orders": False}},
        })
        self.assertEqual(r.status_code, 200, r.data)
        data = self.get(URL, as_=self.admin).data["data"]
        self.assertEqual(data["warehouse"]["unsoldDays"], 10)
        self.assertTrue(data["warehouse"]["autoPriceCut"])
        self.assertEqual(data["platform"]["supportEmail"], "help@reorbit.in")
        self.assertEqual(data["platform"]["sessionMinutes"], 30)
        self.assertTrue(data["notifications"]["quietHours"])
        self.assertTrue(data["notifications"]["channels"]["digest"])
        self.assertTrue(data["notifications"]["channels"]["email"])  # untouched ones stay
        self.assertFalse(data["notifications"]["modules"]["Orders"])
        rules = self.rules()
        self.assertEqual((rules["minDonationItems"], rules["unsoldDays"], rules["supportEmail"]), (3, 10, "help@reorbit.in"))

    def test_nothing_to_change_writes_no_audit_row(self):
        r = self.save({"commerce": {"codLimit": 20000}})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["message"], "Nothing to change.")
        self.assertEqual(AuditLog.objects.filter(action="platform.settings.update").count(), 0)

    def test_each_change_is_audited_and_shown_in_the_log(self):
        self.save({"commerce": {"platformFeePct": 6, "codLimit": 15000}})
        self.save({"warehouse": {"unsoldDays": 9, "slowDays": 15, "deadDays": 31}})
        rows = AuditLog.objects.filter(action="platform.settings.update").order_by("created_at")
        self.assertEqual(rows.count(), 2)
        first = rows[0]
        self.assertEqual(first.actor_type, "admin")
        self.assertEqual(first.actor_public_id, self.admin.public_id)
        self.assertEqual(first.before_data["commerce"], {"codLimit": 20000, "platformFeePct": 3.0})
        self.assertEqual(first.after_data["commerce"], {"codLimit": 15000, "platformFeePct": 6.0})
        log = self.get(URL, as_=self.admin).data["data"]["log"]
        self.assertEqual([e["what"] for e in log], ["Warehouse rules updated", "Fees and delivery updated"])
        self.assertEqual(PlatformSettings.load().updated_by_id, self.admin.pk)


class ValidationTests(SettingsBase):
    def bad(self, body, group, key=None):
        r = self.save(body)
        self.assertEqual(r.status_code, 400, (body, r.data))
        errors = r.data["errors"]
        self.assertIn(group, errors)
        if key:
            self.assertIn(key, errors[group])
        # and nothing was saved
        self.assertEqual(PlatformSettings.load().cod_limit, 20000)
        self.assertEqual(AuditLog.objects.filter(action="platform.settings.update").count(), 0)

    def test_commerce_rules(self):
        for key, value in (("platformFeePct", 31), ("platformFeePct", -1), ("platformFeePct", "abc"),
                           ("platformFeePct", 2.555), ("platformFeePct", True),
                           ("productDelivery", -5), ("productDelivery", 10_001), ("productDelivery", 12.5),
                           ("freeDeliveryFrom", ""), ("codLimit", None), ("codEnabled", "yes"),
                           ("maxListingsPerDay", 0), ("maxListingsPerDay", 101)):
            self.bad({"commerce": {key: value, "sellFreeFrom": 5000}}, "commerce", key)

    def test_unknown_keys_and_groups(self):
        self.bad({"commerce": {"secret": 1}}, "commerce")
        r = self.save({"payments": {}})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self.save({}).status_code, 400)
        self.assertEqual(self.save({"commerce": [1]}).status_code, 400)

    def test_warehouse_rules(self):
        self.bad({"warehouse": {"unsoldDays": 0}}, "warehouse", "unsoldDays")
        self.bad({"warehouse": {"unsoldDays": 10, "slowDays": 10}}, "warehouse", "slowDays")
        self.bad({"warehouse": {"slowDays": 40, "deadDays": 40}}, "warehouse", "deadDays")
        self.bad({"warehouse": {"priceCutPct": 61}}, "warehouse", "priceCutPct")
        self.bad({"warehouse": {"autoPriceCut": "on"}}, "warehouse", "autoPriceCut")

    def test_platform_rules(self):
        self.bad({"platform": {"supportEmail": "nope"}}, "platform", "supportEmail")
        self.bad({"platform": {"minDonationItems": 0}}, "platform", "minDonationItems")
        self.bad({"platform": {"sessionMinutes": 4}}, "platform", "sessionMinutes")
        self.bad({"platform": {"maintenance": "yes"}}, "platform", "maintenance")

    def test_notification_rules(self):
        self.bad({"notifications": {"channels": {"sms": True}}}, "notifications", "channels")
        self.bad({"notifications": {"modules": {"Orders": "no"}}}, "notifications", "modules")
        self.bad({"notifications": {"quietHours": 1}}, "notifications", "quietHours")

    def test_one_bad_group_saves_nothing(self):
        r = self.save({"commerce": {"codLimit": 111}, "platform": {"supportEmail": "bad"}})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(PlatformSettings.load().cod_limit, 20000)


class RulesReachTheRestOfTheAppTests(SettingsBase):
    """Saved values change what the server charges and allows."""

    def test_member_fee_and_delivery_follow_the_settings(self):
        self.save({"commerce": {"platformFeePct": 10, "itemDelivery": 250, "productDelivery": 60,
                                "freeDeliveryFrom": 1000, "sellDelivery": 90, "sellFreeFrom": 3000}})
        self.assertEqual(platform_fee(1000, "user"), 100)
        self.assertEqual(platform_fee(1000, "remaker"), 100)
        self.assertEqual(platform_fee(1000, "platform"), 0)
        self.assertEqual(delivery_charge("user", 500, platform_pickup=True), 250)
        self.assertEqual(delivery_charge("user", 500), 0)
        self.assertEqual(delivery_charge("remaker", 999), 60)
        self.assertEqual(delivery_charge("remaker", 1000), 0)

    def test_reorbits_own_listings_use_their_own_delivery_rule(self):
        self.save({"commerce": {"productDelivery": 60, "freeDeliveryFrom": 1000,
                                "sellDelivery": 90, "sellFreeFrom": 3000}})
        self.assertEqual(delivery_charge("platform", 2999), 90)
        self.assertEqual(delivery_charge("platform", 3000), 0)
        self.assertEqual(delivery_charge("remaker", 2999), 0)  # unaffected

    def test_cod_follows_the_settings(self):
        self.save({"commerce": {"codEnabled": True, "codLimit": 3000}})
        self.assertEqual(cod_block_reason(3000), "")
        self.assertIn("up to", cod_block_reason(3001))
        self.save({"commerce": {"codEnabled": False}})
        self.assertIn("switched off", cod_block_reason(100))

    def test_daily_listing_limit_follows_the_settings(self):
        from apps.listings.views import daily_cap
        self.save({"commerce": {"maxListingsPerDay": 2}})
        self.assertEqual(daily_cap(), 2)

    def test_minimum_donation_size(self):
        self.save({"platform": {"minDonationItems": 3}})
        with self.assertRaises(donation_services.DonationError) as ctx:
            donation_services.create(self.user, {"quantity": 2}, [])
        self.assertIn("at least 3", ctx.exception.errors["quantity"][0])
        with self.assertRaises(donation_services.DonationError) as ctx:
            donation_services.create(self.user, {"quantity": 3}, [])
        self.assertNotIn("quantity", ctx.exception.errors)  # other fields still fail, quantity is fine


class MaintenanceTests(SettingsBase):
    def setUp(self):
        super().setUp()
        self.cat = Category.objects.create(name="Furniture", slug="furniture")
        self.save({"platform": {"maintenance": True}})

    def test_public_rules_say_so(self):
        self.assertTrue(self.rules()["maintenance"])
        self.assertIn("maintenance", maintenance_block_reason())

    def test_members_cannot_check_out(self):
        with self.assertRaises(order_services.CheckoutError) as ctx:
            order_services.create_checkout(self.user, {"method": "COD", "items": []})
        self.assertEqual((ctx.exception.code, ctx.exception.status), ("MAINTENANCE", 503))

    def test_admins_can_still_buy(self):
        try:
            order_services.create_checkout(self.admin, {"method": "COD", "items": []})
        except order_services.CheckoutError as e:
            self.assertNotEqual(e.code, "MAINTENANCE")  # fails later, for a normal reason

    def test_members_cannot_donate(self):
        with self.assertRaises(donation_services.DonationError) as ctx:
            donation_services.create(self.user, {}, [])
        self.assertEqual((ctx.exception.code, ctx.exception.status), ("MAINTENANCE", 503))

    def test_members_cannot_publish_a_listing(self):
        item = Item.objects.create(
            user=self.user, category=self.cat, title="Walnut shelf", description="Solid walnut shelf.",
            condition="Good", quantity=1, listing_price=1000, city="Surat", pincode="395003",
            pickup_preference="Seller_Handover")
        r = self.post(f"/api/listings/me/{item.public_id}/publish/", as_=self.user)
        self.assertEqual(r.status_code, 503, r.data)
        self.assertEqual(r.data["code"], "MAINTENANCE")

    def test_admin_can_switch_it_off_again(self):
        self.save({"platform": {"maintenance": False}})
        self.assertFalse(self.rules()["maintenance"])
        self.assertEqual(maintenance_block_reason(), "")
