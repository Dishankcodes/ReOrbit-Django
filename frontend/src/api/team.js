import { apiRequest } from "./api";

/* Team & Roles (Super Admin only). Rows use the API's snake_case names. */
export const fetchTeam = () => apiRequest("/admins/team/").then((r) => r.data.members);
export const fetchTeamActivity = () => apiRequest("/admins/team/activity/").then((r) => r.data.activity);
export const fetchMe = () => apiRequest("/admins/me/").then((r) => r.data.admin);

/* payload: { full_name, email, phone, note, role_key, modules } -> { member, temporary_password } */
export const createTeamMember = (payload) =>
  apiRequest("/admins/team/", { method: "POST", body: payload }).then((r) => r.data);

export const updateTeamMember = (id, payload) =>
  apiRequest(`/admins/team/${id}/`, { method: "PATCH", body: payload }).then((r) => r.data.member);

export const setTeamMemberStatus = (id, status) =>
  apiRequest(`/admins/team/${id}/status/`, { method: "POST", body: { status } }).then((r) => r.data.member);

export const resetTeamMemberPassword = (id) =>
  apiRequest(`/admins/team/${id}/reset-password/`, { method: "POST", body: {} }).then(
    (r) => r.data.temporary_password,
  );

export const removeTeamMember = (id) => apiRequest(`/admins/team/${id}/`, { method: "DELETE" });
