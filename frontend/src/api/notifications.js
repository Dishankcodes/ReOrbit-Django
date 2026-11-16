import { apiRequest } from "./api";

/* The signed-in member's own inbox (the server decides whose it is). Admins use /admin/ instead. */
const post = (path) => apiRequest(path, { method: "POST" });

export const notificationsApi = {
  list: (params = "") =>
    apiRequest(`/notifications/me/${params}`).then((r) => r.data),
  unreadCount: () =>
    apiRequest("/notifications/me/unread-count/").then(
      (r) => r.data.unread_count,
    ),
  markRead: (id) => post(`/notifications/me/${id}/read/`).then((r) => r.data),
  markAllRead: (module = "") =>
    post(
      `/notifications/me/read-all/${module ? `?module=${encodeURIComponent(module)}` : ""}`,
    ).then((r) => r.data),
  dismiss: (id) =>
    apiRequest(`/notifications/me/${id}/`, { method: "DELETE" }).then(
      (r) => r.data,
    ),
  dismissRead: () => post("/notifications/me/dismiss-read/").then((r) => r.data),
};
