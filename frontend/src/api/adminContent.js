import { apiRequest } from "./api";

/* Admin > Content: banners, FAQs and policies (/api/content/admin/...). */
const A = "/content/admin";
const body = (method, b) => ({ method, body: b });

export const adminContentApi = {
  banners: () => apiRequest(`${A}/banners/`).then((r) => r.data.results),
  createBanner: (v) =>
    apiRequest(`${A}/banners/`, body("POST", v)).then((r) => r.data.banner),
  updateBanner: (id, v) =>
    apiRequest(`${A}/banners/${id}/`, body("PATCH", v)).then(
      (r) => r.data.banner,
    ),
  duplicateBanner: (id) =>
    apiRequest(`${A}/banners/${id}/duplicate/`, body("POST", {})).then(
      (r) => r.data.banner,
    ),
  moveBanner: (id, dir) =>
    apiRequest(`${A}/banners/${id}/move/`, body("POST", { dir })).then(
      (r) => r.data.results,
    ),
  removeBanner: (id) => apiRequest(`${A}/banners/${id}/`, { method: "DELETE" }),

  faqs: () => apiRequest(`${A}/faqs/`).then((r) => r.data.results),
  createFaq: (v) =>
    apiRequest(`${A}/faqs/`, body("POST", v)).then((r) => r.data.faq),
  updateFaq: (id, v) =>
    apiRequest(`${A}/faqs/${id}/`, body("PATCH", v)).then((r) => r.data.faq),
  moveFaq: (id, dir) =>
    apiRequest(`${A}/faqs/${id}/move/`, body("POST", { dir })).then(
      (r) => r.data.results,
    ),
  removeFaq: (id) => apiRequest(`${A}/faqs/${id}/`, { method: "DELETE" }),

  policies: () => apiRequest(`${A}/policies/`).then((r) => r.data.results),
  saveDraft: (key, b) =>
    apiRequest(`${A}/policies/${key}/draft/`, body("POST", b)).then(
      (r) => r.data.policy,
    ),
  discardDraft: (key) =>
    apiRequest(`${A}/policies/${key}/draft/`, { method: "DELETE" }).then(
      (r) => r.data.policy,
    ),
  publish: (key, b) =>
    apiRequest(`${A}/policies/${key}/publish/`, body("POST", b)).then(
      (r) => r.data,
    ),
  restore: (key, version) =>
    apiRequest(`${A}/policies/${key}/restore/`, body("POST", { version })).then(
      (r) => r.data,
    ),
  log: () => apiRequest(`${A}/log/`).then((r) => r.data.results),
};

/* Public reads used by the storefronts. */
export const publicContentApi = {
  banners: (placement, audience) =>
    apiRequest(
      `/content/banners/?${new URLSearchParams({ ...(placement ? { placement } : {}), audience })}`,
      { auth: false },
    ).then((r) => r.data.results),
  count: (id, what) =>
    apiRequest(`/content/banners/${id}/${what}/`, {
      method: "POST",
      body: {},
      auth: false,
    }).catch(() => {}),
  faqs: () =>
    apiRequest("/content/faqs/", { auth: false }).then((r) => r.data.results),
  policies: () =>
    apiRequest("/content/policies/", { auth: false }).then(
      (r) => r.data.results,
    ),
};
