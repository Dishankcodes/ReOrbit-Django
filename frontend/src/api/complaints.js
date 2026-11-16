import { apiRequest } from "./api";

/* Complaints. Members and ReMakers file reports (/api/complaints/me/);
   the admin team works them (/api/complaints/admin/). The server checks every
   rule and does the real thing (suspend, take a listing down, hide a review). */
const A = "/complaints/admin";
const call = (path, method, body) =>
  apiRequest(path, { method, body }).then((r) => r.data);

export const complaintsApi = {
  /* a member or ReMaker reports a person or listing: { type, target_id, category, description } -> { id } */
  file: (body) => call("/complaints/me/", "POST", body),

  list: () => call(`${A}/`, "GET"), // { results, count }
  targets: () => call(`${A}/targets/`, "GET"), // { User:[{id,label}], ReMaker, Product, Review }
  log: (body) => call(`${A}/`, "POST", body),
  /* key: start | assign | dismiss | warn | suspend | block | removeProduct | removeReview | reopen */
  act: (id, key, payload = {}) => call(`${A}/${id}/${key}/`, "POST", payload),
  addNote: (id, text) => call(`${A}/${id}/notes/`, "POST", { text }),
};
