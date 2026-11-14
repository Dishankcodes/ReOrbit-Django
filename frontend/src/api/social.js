import { apiRequest } from "./api";

/* Wishlist: one list per signed-in account (member, ReMaker or admin). */
export const wishlistApi = {
  list: () => apiRequest("/social/wishlist/").then((r) => r.data.items),
  add: (id) =>
    apiRequest("/social/wishlist/", { method: "POST", body: { id } }).then(
      (r) => r.data,
    ),
  remove: (id) =>
    apiRequest(`/social/wishlist/${id}/`, { method: "DELETE" }).then(
      (r) => r.data,
    ),
  clear: () =>
    apiRequest("/social/wishlist/", { method: "DELETE" }).then((r) => r.data),
};

export const followApi = {
  list: () => apiRequest("/social/follow/").then((r) => r.data.following),
  /* Newest live products from the ReMakers I follow */
  feed: () => apiRequest("/social/follow/feed/").then((r) => r.data.items),
  followers: () => apiRequest("/social/followers/").then((r) => r.data.followers),
  removeFollower: (id) => apiRequest(`/social/followers/${id}/`, { method: "DELETE" }),
  follow: (id) => apiRequest("/social/follow/", { method: "POST", body: { id } }),
  unfollow: (id) => apiRequest(`/social/follow/${id}/`, { method: "DELETE" }),
};

export const cartApi = {
  get: () => apiRequest("/social/cart/").then((r) => r.data.items),
  replace: (items) => apiRequest("/social/cart/", { method: "PUT", body: { items } }).then((r) => r.data.items),
};

export const supportApi = {
  list: () => apiRequest("/support/me/").then((response) => response.data),
  get: (id) => apiRequest(`/support/me/${encodeURIComponent(id)}/`).then((response) => response.data.ticket),
  create: (body) => apiRequest("/support/me/", { method: "POST", body }).then((response) => response.data.ticket),
  reply: (id, body) => apiRequest(`/support/me/${encodeURIComponent(id)}/`, { method: "POST", body }).then((response) => response.data.ticket),
  adminList: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
    });
    const suffix = query.toString();
    return apiRequest(`/support/admin/${suffix ? `?${suffix}` : ""}`).then((response) => response.data);
  },
  adminGet: (id) => apiRequest(`/support/admin/${encodeURIComponent(id)}/`).then((response) => response.data.ticket),
  adminAction: (id, body) => apiRequest(`/support/admin/${encodeURIComponent(id)}/`, { method: "POST", body }).then((response) => response.data.ticket),
};
