from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class PickupPartnerMigrationTests(TransactionTestCase):
    """Migration 0002 repairs a missing legacy column and remains reversible."""

    migrate_from = [("donations", "0001_initial")]
    migrate_to = [("donations", "0002_pickup_partners_and_verification")]

    def column_names(self, model):
        with connection.cursor() as cursor:
            description = connection.introspection.get_table_description(
                cursor, model._meta.db_table
            )
        return {column.name for column in description}

    def test_missing_partner_team_column_migrates_and_reverses(self):
        executor = MigrationExecutor(connection)
        executor.migrate(self.migrate_from)
        old_apps = executor.loader.project_state(self.migrate_from).apps
        DonationBefore = old_apps.get_model("donations", "Donation")
        partner_team = DonationBefore._meta.get_field("partner_team")

        # Reproduce the reported state: migration 0001 is recorded, but its
        # partner_team column has already been removed from the database.
        with connection.schema_editor() as schema_editor:
            schema_editor.remove_field(DonationBefore, partner_team)
        self.assertNotIn("partner_team", self.column_names(DonationBefore))

        executor = MigrationExecutor(connection)
        executor.migrate(self.migrate_to)
        migrated_apps = executor.loader.project_state(self.migrate_to).apps
        DonationAfter = migrated_apps.get_model("donations", "Donation")
        self.assertNotIn("partner_team", self.column_names(DonationAfter))
        self.assertIn("assigned_partner_id", self.column_names(DonationAfter))

        # Reversing to 0001 restores the original model/database schema.
        executor = MigrationExecutor(connection)
        executor.migrate(self.migrate_from)
        reversed_apps = executor.loader.project_state(self.migrate_from).apps
        DonationReversed = reversed_apps.get_model("donations", "Donation")
        self.assertIn("partner_team", self.column_names(DonationReversed))

        # Leave the test database at its normal latest migration state.
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
