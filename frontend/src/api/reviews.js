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
