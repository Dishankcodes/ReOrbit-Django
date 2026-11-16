import { apiRequest } from "./api";

/* ReMaker analytics: the numbers for /remaker-analytics, and the view counter the
   product and profile pages report to. */
export const analyticsApi = {
  report: (range) =>
    apiRequest(`/analytics/me/?range=${encodeURIComponent(range)}`).then(
      (r) => r.data,
    ),
  /* counting a view must never get in the way of the page, so errors are ignored */
  recordView: (body) =>
    apiRequest("/analytics/view/", { method: "POST", body }).catch(() => {}),
};
