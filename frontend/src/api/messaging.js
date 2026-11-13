import { apiRequest } from "./api";
import { getAccountType } from "./session";

export const messagingApi = {
  list: () => apiRequest(getAccountType() === "admin" ? "/messaging/admin/" : "/messaging/me/").then((r) => r.data.conversations),
  get: (id) => apiRequest(`/messaging/me/${id}/`).then((r) => r.data.conversation),
  start: (body) => apiRequest("/messaging/me/", { method: "POST", body }).then((r) => r.data.conversation),
  send: (id, body) => apiRequest(`/messaging/me/${id}/`, { method: "POST", body }).then((r) => r.data.message),
  read: (id) => apiRequest(`/messaging/me/${id}/`, { method: "POST", body: { action: "read" } }),
  unread: (id) => apiRequest(`/messaging/me/${id}/`, { method: "POST", body: { action: "unread" } }),
  archive: (id) => apiRequest(`/messaging/me/${id}/`, { method: "POST", body: { action: "archive" } }),
};
