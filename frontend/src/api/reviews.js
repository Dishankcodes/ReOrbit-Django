import { apiRequest } from "./api";

/* Reviews a member or ReMaker writes after an order is delivered. */
export const reviewsApi = {
  /* every delivered item with its product review and the seller review (or null) */
  list: (q = "") =>
    apiRequest(`/reviews/me/${q ? `?q=${encodeURIComponent(q)}` : ""}`).then(
      (r) => r.data,
    ),
  /* `form` is a FormData: rating, title, body, quality..., recommend, photos, remove_photos. Saves or edits. */
  saveProduct: (orderId, lineId, form) =>
    apiRequest(
      `/reviews/me/orders/${orderId}/items/${encodeURIComponent(lineId)}/product/`,
      { method: "POST", body: form },
    ).then((r) => r.data.review),
  saveSeller: (orderId, body) =>
    apiRequest(`/reviews/me/orders/${orderId}/seller/`, {
      method: "POST",
      body,
    }).then((r) => r.data.review),
};

const post = (path, body) =>
  apiRequest(path, { method: "POST", body });

/* Reviews a member or ReMaker has RECEIVED as a seller, and what they can do with them. */
export const receivedReviewsApi = {
  list: () => apiRequest("/reviews/received/").then((r) => r.data),
  reply: (id, reply) =>
    post(`/reviews/received/${id}/reply/`, { reply }).then((r) => r.data.review),
  removeReply: (id) =>
    apiRequest(`/reviews/received/${id}/reply/`, { method: "DELETE" }).then(
      (r) => r.data.review,
    ),
};

/* Report a review to ReOrbit (any signed-in member or ReMaker, not for their own review). */
export const reviewReportApi = {
  report: (id, reason, note = "") =>
    post(`/reviews/${id}/report/`, { reason, note }).then((r) => r.data.report),
  withdraw: (id) =>
    apiRequest(`/reviews/${id}/report/`, { method: "DELETE" }),
};

/* Public pages: no sign-in needed. */
export const publicReviewsApi = {
  forProduct: (ref) =>
    apiRequest(`/reviews/public/product/${encodeURIComponent(ref)}/`, {
      auth: false,
    }).then((r) => r.data),
  forSeller: (type, id) =>
    apiRequest(
      `/reviews/public/seller/${type}/${encodeURIComponent(id)}/`,
      { auth: false },
    ).then((r) => r.data),
};

/* Admin › Reviews (needs the Complaints module). */
export const adminReviewsApi = {
  list: (params = "") =>
    apiRequest(`/reviews/admin/${params}`).then((r) => r.data),
  hide: (id, reason) =>
    post(`/reviews/admin/${id}/hide/`, { reason }).then((r) => r.data.review),
  restore: (id) =>
    post(`/reviews/admin/${id}/restore/`, {}).then((r) => r.data.review),
  resolve: (reportId, action, note = "") =>
    post(`/reviews/admin/reports/${reportId}/resolve/`, { action, note }).then(
      (r) => r.data.review,
    ),
};
