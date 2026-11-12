import { apiRequest } from "./api";

/* Listings API. Rows use the server's snake_case names; the seller store maps them. */
export const fetchCategories = () =>
  apiRequest("/listings/categories/", { auth: false }).then(
    (r) => r.data.categories,
  );
export const fetchMyListings = () =>
  apiRequest("/listings/me/").then((r) => r.data);

/* each of these returns { listing, limit } */
export const createListing = (body) =>
  apiRequest("/listings/me/", { method: "POST", body }).then((r) => r.data);
export const updateListing = (id, body) =>
  apiRequest(`/listings/me/${id}/`, { method: "PATCH", body }).then(
    (r) => r.data,
  );
export const publishListing = (id) =>
  apiRequest(`/listings/me/${id}/publish/`, { method: "POST", body: {} }).then(
    (r) => r.data,
  );
export const withdrawListing = (id) =>
  apiRequest(`/listings/me/${id}/withdraw/`, { method: "POST", body: {} }).then(
    (r) => r.data,
  );
export const deleteListing = (id) =>
  apiRequest(`/listings/me/${id}/`, { method: "DELETE" });

export function uploadListingImages(id, files) {
  const form = new FormData();
  files.forEach((f) => form.append("images", f));
  return apiRequest(`/listings/me/${id}/images/`, {
    method: "POST",
    body: form,
  }).then((r) => r.data);
}
export const deleteListingImage = (id, imageId) =>
  apiRequest(`/listings/me/${id}/images/${imageId}/`, {
    method: "DELETE",
  }).then((r) => r.data);
export const reorderListingImages = (id, order) =>
  apiRequest(`/listings/me/${id}/images/order/`, {
    method: "POST",
    body: { order },
  }).then((r) => r.data);

/* admin (module "products") */
export const fetchAdminListings = (params = "") =>
  apiRequest(`/listings/admin/${params}`).then((r) => r.data);
export const moderateListing = (id, status, note = "") =>
  apiRequest(`/listings/admin/${id}/moderate/`, {
    method: "POST",
    body: { status, note },
  }).then((r) => r.data.listing);
