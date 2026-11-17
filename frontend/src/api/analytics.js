import { apiRequest } from "./api";

/* Numbers from the server.
   ReMaker: the analytics page, the home dashboard, and the view counter the product and
   profile pages report to. Admin: Reports (also feeds the Dashboard) and Earnings. */
export const analyticsApi = {
  report: (range) =>
    apiRequest(`/analytics/me/?range=${encodeURIComponent(range)}`).then(
      (r) => r.data,
    ),
  dashboard: () => apiRequest("/analytics/me/dashboard/").then((r) => r.data),
  adminReport: (range) =>
    apiRequest(`/analytics/admin/report/?range=${encodeURIComponent(range)}`).then(
      (r) => r.data,
    ),
  adminEarnings: (range) =>
    apiRequest(
      `/analytics/admin/earnings/?range=${encodeURIComponent(range)}`,
    ).then((r) => r.data),
  /* counting a view must never get in the way of the page, so errors are ignored */
  recordView: (body) =>
    apiRequest("/analytics/view/", { method: "POST", body }).catch(() => {}),
};
