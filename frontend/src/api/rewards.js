import { apiRequest } from "./api";

/* Rewards. The server is the only source of truth for points, levels, vouchers and redemptions:
   nothing here is computed or stored in the browser. */
const post = (path, body = {}) => apiRequest(path, { method: "POST", body });
const patch = (path, body = {}) => apiRequest(path, { method: "PATCH", body });
const qs = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : "";
};

/* Member */
export const rewardsApi = {
  summary: () => apiRequest("/rewards/me/summary/").then((r) => r.data),
  ledger: (params) =>
    apiRequest(`/rewards/me/ledger/${qs({ page_size: 100, ...params })}`).then(
      (r) => r.data,
    ),
  rules: () => apiRequest("/rewards/me/rules/").then((r) => r.data.rules),
  offers: () => apiRequest("/rewards/me/offers/").then((r) => r.data.offers),
  redeem: (offerId) =>
    post(`/rewards/me/offers/${offerId}/redeem/`).then((r) => r.data),
  vouchers: () => apiRequest("/rewards/me/vouchers/").then((r) => r.data),
};

/* Admin (module "rewards") */
export const adminRewardsApi = {
  rules: () => apiRequest("/rewards/admin/rules/").then((r) => r.data),
  saveRule: (key, body) =>
    patch(`/rewards/admin/rules/${key}/`, body).then((r) => r.data),
  offers: (params) =>
    apiRequest(`/rewards/admin/offers/${qs(params)}`).then((r) => r.data),
  createOffer: (body) =>
    post("/rewards/admin/offers/", body).then((r) => r.data),
  saveOffer: (id, body) =>
    patch(`/rewards/admin/offers/${id}/`, body).then((r) => r.data),
  deleteOffer: (id) =>
    apiRequest(`/rewards/admin/offers/${id}/`, { method: "DELETE" }),
  redemptions: (params) =>
    apiRequest(`/rewards/admin/redemptions/${qs(params)}`).then((r) => r.data),
  cancelRedemption: (id, reason) =>
    post(`/rewards/admin/redemptions/${id}/cancel/`, { reason }).then(
      (r) => r.data,
    ),
  users: (params) =>
    apiRequest(`/rewards/admin/users/${qs(params)}`).then((r) => r.data),
  adjust: (id, body) =>
    post(`/rewards/admin/users/${id}/adjust/`, body).then((r) => r.data),
  userLedger: (id, params) =>
    apiRequest(`/rewards/admin/users/${id}/ledger/${qs(params)}`).then(
      (r) => r.data,
    ),
  donationRewards: (params) =>
    apiRequest(`/rewards/admin/donation-rewards/${qs(params)}`).then(
      (r) => r.data,
    ),
  revokeDonation: (id, reason) =>
    post(`/rewards/admin/donation-rewards/${id}/revoke/`, { reason }).then(
      (r) => r.data,
    ),
  restoreDonation: (id, reason) =>
    post(`/rewards/admin/donation-rewards/${id}/restore/`, { reason }).then(
      (r) => r.data,
    ),
};
