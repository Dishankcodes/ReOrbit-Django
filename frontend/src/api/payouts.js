import { apiRequest } from "./api";

/* Seller wallet and payouts. Amounts are whole rupees. */
export const walletApi = {
  summary: () => apiRequest("/payments/wallet/").then((r) => r.data),
  entries: (qs = "") => apiRequest(`/payments/wallet/entries/${qs}`).then((r) => r.data),
  payouts: (qs = "") => apiRequest(`/payments/payouts/${qs}`).then((r) => r.data),
  saveAccount: (body) =>
    apiRequest("/payments/account/", { method: "PUT", body }).then((r) => r.data.account),
  /* `amount` is optional: leave it out to withdraw everything available. */
  request: (amount) =>
    apiRequest("/payments/payouts/request/", { method: "POST", body: amount ? { amount } : {} }).then((r) => r.data),
};

export const adminPayoutApi = {
  summary: () => apiRequest("/payments/admin/summary/").then((r) => r.data),
  list: (qs = "") => apiRequest(`/payments/admin/payouts/${qs}`).then((r) => r.data),
  pay: (id, reference) =>
    apiRequest(`/payments/admin/payouts/${id}/pay/`, { method: "POST", body: { reference } }).then((r) => r.data.payout),
  reject: (id, reason) =>
    apiRequest(`/payments/admin/payouts/${id}/reject/`, { method: "POST", body: { reason } }).then((r) => r.data.payout),
  details: (id) => apiRequest(`/payments/admin/payouts/${id}/details/`).then((r) => r.data.account),
  runAuto: () => apiRequest("/payments/admin/payouts/run-auto/", { method: "POST", body: {} }).then((r) => r.data),
  rules: () => apiRequest("/payments/admin/rules/").then((r) => r.data),
  saveRules: (body) => apiRequest("/payments/admin/rules/", { method: "PATCH", body }).then((r) => r.data),
};
