import { apiRequest } from "./api";

/* Admin › Pickups and Pickup teams (/api/pickups/admin/). The server checks every rule
   (who can take work, what can move, what can be deleted) and answers with what the screens show.
   Donation pickups are run through adminDonationApi in ./donations.js. */
const A = "/pickups/admin";
const send = (path, method, body) =>
  apiRequest(`${A}${path}`, { method, body }).then((r) => r.data);

export const pickupApi = {
  /* pickups of listed items: { results, count } */
  requests: () => send("/requests/", "GET"),
  act: (id, key, payload = {}) =>
    send(`/requests/${id}/${key}/`, "POST", payload),

  teams: () => send("/teams/", "GET"),
  createTeam: (body) => send("/teams/", "POST", body),
  updateTeam: (id, body) => send(`/teams/${id}/`, "PATCH", body),
  removeTeam: (id) => send(`/teams/${id}/`, "DELETE"),
  /* { status: "Active" | "Paused", reason?, move_to? } */
  setTeamStatus: (id, body) => send(`/teams/${id}/status/`, "POST", body),

  /* every member call answers with the whole updated team */
  addMember: (teamId, body) => send(`/teams/${teamId}/members/`, "POST", body),
  updateMember: (teamId, memberId, body) =>
    send(`/teams/${teamId}/members/${memberId}/`, "PATCH", body),
  removeMember: (teamId, memberId) =>
    send(`/teams/${teamId}/members/${memberId}/`, "DELETE"),
  makeLead: (teamId, memberId) =>
    send(`/teams/${teamId}/members/${memberId}/make-lead/`, "POST"),
  setMemberStatus: (teamId, memberId, status) =>
    send(`/teams/${teamId}/members/${memberId}/status/`, "POST", { status }),
  moveMember: (teamId, memberId, to) =>
    send(`/teams/${teamId}/members/${memberId}/move/`, "POST", { to }),
};
