import { apiRequest } from "./api";

/* Admin Dashboard and the work queues, from the server. */
export const adminOpsApi = {
  dashboard: () => apiRequest("/adminops/admin/dashboard/").then((r) => r.data),
  operations: () =>
    apiRequest("/adminops/admin/operations/").then((r) => r.data.operations),
};
