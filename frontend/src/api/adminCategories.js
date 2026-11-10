import { apiRequest } from "./api";

/* Admin > Content > Categories. */
export const adminCategoryApi = {
  list: () => apiRequest("/core/admin/categories/").then((r) => r.data.results),
  create: (v) =>
    apiRequest("/core/admin/categories/", { method: "POST", body: { name: v.name, description: v.blurb, icon: v.icon } })
      .then((r) => r.data.category),
  update: (id, body) => apiRequest(`/core/admin/categories/${id}/`, { method: "PATCH", body }).then((r) => r.data.category),
  move: (id, dir) => apiRequest(`/core/admin/categories/${id}/move/`, { method: "POST", body: { dir } }).then((r) => r.data.results),
  remove: (id) => apiRequest(`/core/admin/categories/${id}/`, { method: "DELETE" }),
};
