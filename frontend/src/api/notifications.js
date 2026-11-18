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

/* An admin's own inbox (orders, donations, complaints, support... notify the admins who can act). */
export const adminNotificationsApi = {
  list: (params = "") =>
    apiRequest(`/notifications/admin/${params}`).then((r) => r.data),
  markRead: (id) => post(`/notifications/admin/${id}/read/`).then((r) => r.data),
  markAllRead: () => post("/notifications/admin/read-all/").then((r) => r.data),
  dismiss: (id) =>
    apiRequest(`/notifications/admin/${id}/`, { method: "DELETE" }).then(
      (r) => r.data,
    ),
};

/* Admin › Notifications › Announcements (sent to every member / ReMaker inbox) */
export const adminAnnouncementsApi = {
  list: () =>
    apiRequest("/notifications/admin/announcements/").then(
      (r) => r.data.announcements,
    ),
  reach: () =>
    apiRequest("/notifications/admin/announcements/reach/").then((r) => r.data),
  send: (body) =>
    apiRequest("/notifications/admin/announcements/", {
      method: "POST",
      body,
    }).then((r) => r.data.announcement),
  cancel: (id) =>
    apiRequest(`/notifications/admin/announcements/${id}/`, {
      method: "DELETE",
    }),
  update: (id, body) =>
    apiRequest(`/notifications/admin/announcements/${id}/`, { method: "PATCH", body }).then(
      (r) => r.data.announcement,
    ),
  act: (id, action) =>
    apiRequest(`/notifications/admin/announcements/${id}/`, { method: "POST", body: { action } }).then((r) => ({
      announcement: r.data.announcement,
      message: r.message,
    })),
};
