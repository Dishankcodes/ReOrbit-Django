/* Platform settings: the rules everyone reads, and the admin calls that change them. */
import { apiRequest } from "./api";

/* Public. Fees, delivery, COD, listing and donation limits, support email, maintenance. */
export const fetchRules = () =>
  apiRequest("/core/settings/", { auth: false }).then((r) => r.data);

/* Admin (module "settings"): { commerce, warehouse, notifications, platform, log, rules } */
export const fetchAdminSettings = () =>
  apiRequest("/platform/admin/settings/").then((r) => r.data);

/* patch: one or more of { commerce, warehouse, notifications, platform }.
   Rejects with an Error that has .errors ({ group: { field: message } }) when the server says no. */
export const saveAdminSettings = (patch) =>
  apiRequest("/platform/admin/settings/", { method: "PATCH", body: patch }).then(
    (r) => r.data,
  );
