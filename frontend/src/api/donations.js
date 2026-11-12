import { apiRequest } from "./api";

/* Donations. The member gives an item, ReOrbit accepts it, books the free pickup, collects it and
   marks it received at the warehouse - that is when the member's voucher is issued. */
const post = (path, body = {}) => apiRequest(path, { method: "POST", body });

export const donationApi = {
  list: () => apiRequest("/donations/me/").then((r) => r.data.donations),
  get: (id) => apiRequest(`/donations/me/${id}/`).then((r) => r.data.donation),
  /* `form` is a FormData: title, category, description, condition, quantity, address_id,
     contact_name, phone, date, slot, note and one or more `images` files */
  create: (form) => apiRequest("/donations/me/", { method: "POST", body: form }).then((r) => r.data.donation),
  cancel: (id, reason) => post(`/donations/me/${id}/cancel/`, { reason }).then((r) => r.data.donation),
  reschedule: (id, body) => post(`/donations/me/${id}/reschedule/`, body).then((r) => r.data.donation),
  note: (id, note) => post(`/donations/me/${id}/note/`, { note }).then((r) => r.data.donation),
};

export const voucherApi = {
  mine: () => apiRequest("/rewards/me/vouchers/").then((r) => r.data),
};

/* Admin (module "donations"). `action` is one of
   accept | reject | reschedule | cancelPickup | pickedUp | received | complete | reopen
   with date, slot, partner, reason or ngo where the action needs them. */
export const adminDonationApi = {
  list: (params = "") => apiRequest(`/donations/admin/${params}`).then((r) => r.data),
  get: (id) => apiRequest(`/donations/admin/${id}/`).then((r) => r.data.donation),
  act: (id, action, body = {}) => post(`/donations/admin/${id}/action/`, { action, ...body }).then((r) => r.data.donation),
};

/* Admin (module "warehouse"): donated items that reached the warehouse */
export const adminWarehouseApi = {
  list: (params = "") => apiRequest(`/warehouse/admin/${params}`).then((r) => r.data),
  move: (id, location) =>
    apiRequest(`/warehouse/admin/${id}/`, { method: "PATCH", body: { location } }).then((r) => r.data.item),
};
