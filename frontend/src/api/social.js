import { apiRequest } from "./api";

/* Wishlist: one list per signed-in account (member, ReMaker or admin). */
export const wishlistApi = {
  list: () => apiRequest("/social/wishlist/").then((r) => r.data.items),
  add: (id) => apiRequest("/social/wishlist/", { method: "POST", body: { id } }).then((r) => r.data),
  remove: (id) => apiRequest(`/social/wishlist/${id}/`, { method: "DELETE" }).then((r) => r.data),
  clear: () => apiRequest("/social/wishlist/", { method: "DELETE" }).then((r) => r.data),
};
