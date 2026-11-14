import { apiRequest } from "./api";
import { getAccountType } from "./session";

const endpoint = () =>
  getAccountType() === "admin" ? "/messaging/admin/" : "/messaging/me/";

const queryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
};

export const messagingApi = {
  list: (params) =>
    apiRequest(`${endpoint()}${queryString(params)}`).then((response) => response.data),
  get: (id, params) =>
    apiRequest(`${endpoint()}${encodeURIComponent(id)}/${queryString(params)}`).then(
      (response) => response.data.conversation,
    ),
  start: (body) =>
    apiRequest(endpoint(), { method: "POST", body }).then(
      (response) => response.data.conversation,
    ),
  send: (id, body) =>
    apiRequest(`${endpoint()}${encodeURIComponent(id)}/`, { method: "POST", body }).then(
      (response) => response.data.message,
    ),
  read: (id) =>
    apiRequest(`${endpoint()}${encodeURIComponent(id)}/`, {
      method: "POST",
      body: { action: "read" },
    }),
  unread: (id) =>
    apiRequest(`${endpoint()}${encodeURIComponent(id)}/`, {
      method: "POST",
      body: { action: "unread" },
    }),
  archive: (id) =>
    apiRequest(`${endpoint()}${encodeURIComponent(id)}/`, {
      method: "POST",
      body: { action: "archive" },
    }),
};
