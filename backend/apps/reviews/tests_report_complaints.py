"""A review report also lands in Admin › Complaints (team notified, reporter sees it in My reports),
and settling it on either page settles it on the other."""

from apps.complaints.models import Complaint
from apps.core.models import Notification

from .models import ReviewReport
from .tests import ReviewBase


class ReviewReportComplaintTests(ReviewBase):
    def setUp(self):
        super().setUp()
        self.mod = self.make_admin("rmod@example.com", modules={"complaints": "edit"})
        self.viewer = self.make_admin("rview@example.com", modules={"complaints": "view"})

    def reviewed(self, item, seller=False):
        oid, ref = self.delivered(item)
        self.assertEqual(self.rate_product(oid, ref, rating=5, title="Nice", body="Really good one.").status_code, 201)

    def received(self, who):
        return self.get("/api/reviews/received/", as_=who).data["data"]["results"]

    def report(self, rid, who=None, reason="Looks fake or paid for"):
        r = self.post(f"/api/reviews/{rid}/report/", {"reason": reason, "note": "Same text on 5 shops."}, as_=who or self.maker)
        self.assertEqual(r.status_code, 201, r.data)

    def test_report_files_a_complaint_and_tells_the_team(self):
        self.reviewed(self.table, seller=False)
        rid = self.received(self.maker)[0]["id"]
        self.report(rid)
        c = Complaint.objects.get()
        self.assertEqual((c.target_type, c.category, c.status, c.reporter_remaker), ("Review", "Fake or paid review", "Open", self.maker))
        self.assertEqual(c.target_product_review.public_id, rid)
        self.assertTrue(Notification.objects.filter(admin=self.mod, module="complaints").exists())
        mine = self.get("/api/complaints/me/", as_=self.maker).data["data"]
        self.assertEqual(mine["results"][0]["id"] if "results" in mine else mine[0]["id"], c.public_id)
        adm = self.get("/api/complaints/admin/", as_=self.viewer)
        self.assertEqual(adm.status_code, 200)
        self.assertIn(c.public_id, str(adm.data))

    def test_withdrawing_drops_the_complaint(self):
        self.reviewed(self.table, seller=False)
        rid = self.received(self.maker)[0]["id"]
        self.report(rid)
        self.assertEqual(self.client.delete(f"/api/reviews/{rid}/report/", **self._headers(self.maker)).status_code, 200)
        self.assertFalse(Complaint.objects.exists())

    def test_removing_in_complaints_settles_the_review_report(self):
        self.reviewed(self.table, seller=False)
        rid = self.received(self.maker)[0]["id"]
        self.report(rid)
        c = Complaint.objects.get()
        r = self.post(f"/api/complaints/admin/{c.public_id}/removeReview/", {"reason": "Copied review."}, as_=self.mod)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(ReviewReport.objects.get().status, "Upheld")
        self.assertEqual(self.get("/api/reviews/admin/?reported=1", as_=self.viewer).data["data"]["counts"]["reported"], 0)

    def test_dismissing_on_reviews_page_closes_the_complaint(self):
        self.reviewed(self.table, seller=False)
        rid = self.received(self.maker)[0]["id"]
        self.report(rid)
        rep = ReviewReport.objects.get().public_id
        r = self.post(f"/api/reviews/admin/reports/{rep}/resolve/", {"action": "dismiss", "note": "Fine."}, as_=self.mod)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(Complaint.objects.get().status, "Dismissed")
