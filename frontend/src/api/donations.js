import { API_BASE_URL, apiRequest } from "./api";
import { getAccessToken } from "./session";

/* Donations and donation vouchers. The server decides every status, reward and discount;
   the browser only sends what the person typed. Each call returns the data the stores adapt. */
const post = (path, body = {}) => apiRequest(path, { method: "POST", body });

/* Member side. */
export const donationApi = {
  list: () => apiRequest("/donations/me/").then((r) => r.data),
  /* `body` is FormData: fields + one or more `images` files. */
  create: (body) => post("/donations/me/", body).then((r) => r.data),
  cancel: (id, reason) =>
    post(`/donations/me/${id}/cancel/`, { reason }).then((r) => r.data),
  reschedule: (id, { date, slot, reason }) =>
    post(`/donations/me/${id}/reschedule/`, { date, slot, reason }).then(
      (r) => r.data,
    ),
  note: (id, note) =>
    post(`/donations/me/${id}/note/`, { note }).then((r) => r.data),
  /* Fetches the certificate PDF with the signed-in token and saves it, since a plain
     <a href> can't carry an Authorization header. Only works once the donation is Completed. */
  downloadCertificate: async (id) => {
    const res = await fetch(`${API_BASE_URL}/donations/me/${id}/certificate/`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "The certificate isn't ready yet.");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${id}-certificate.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

/* Admin side. `list` resolves to { results, count }. `key` is one of
   accept | reject | reschedule | cancelPickup | pickedUp | failed | received | complete | reopen. */
export const adminDonationApi = {
  list: () => apiRequest("/donations/admin/").then((r) => r.data),
  act: (id, key, payload = {}) =>
    post(`/donations/admin/${id}/${key}/`, payload).then((r) => r.data),
  /* Pickup partners have no ReOrbit login: give the driver their token directly. */
  partners: {
    list: () => apiRequest("/donations/admin/partners/").then((r) => r.data),
    create: (name, phone = "") =>
      post("/donations/admin/partners/", { name, phone }).then((r) => r.data),
  },
};

/* The member's donation vouchers: { vouchers: [...], ready: n }. */
export const voucherApi = {
  mine: () => apiRequest("/rewards/me/vouchers/").then((r) => r.data),
};

/* Pickup partner app (no ReOrbit login — authenticated by the token an admin issued
   above, sent as X-Partner-Token on every call, never through apiRequest's bearer auth). */
async function partnerRequest(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "X-Partner-Token": token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.code = data.code;
    throw error;
  }
  return data.data;
}

export const partnerApi = {
  pickups: (token) => partnerRequest("/donations/partner/pickups/", { token }),
  collect: (token, id, code) =>
    partnerRequest(`/donations/partner/pickups/${id}/collect/`, {
      method: "POST",
      token,
      body: { code },
    }),
  markFailed: (token, id, reason) =>
    partnerRequest(`/donations/partner/pickups/${id}/failed/`, {
      method: "POST",
      token,
      body: { reason },
    }),
};
