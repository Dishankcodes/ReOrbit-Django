import { apiRequest } from "./api";

/* Admin moderation of ReMaker products (module "products") */
export const fetchAdminRemakerProducts = (qs = "") => apiRequest(`/remakers/products/admin/${qs}`).then((r) => r.data);
export const deactivateRemakerProduct = (id, reason) =>
  apiRequest(`/remakers/products/admin/${id}/deactivate/`, { method: "POST", body: { reason } }).then((r) => r.data.product);
export const reactivateRemakerProduct = (id) =>
  apiRequest(`/remakers/products/admin/${id}/reactivate/`, { method: "POST", body: {} }).then((r) => r.data.product);
