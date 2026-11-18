/* Warehouse stock (admin module "warehouse"): see backend/apps/warehouse/views.py.
   Rows come back in the shape the Warehouse screens already use. */
import { apiRequest } from "./api";

const base = "/warehouse/admin";

export const warehouseApi = {
  /* { items, layout } — layout is the floor plan (floors and their zones) */
  list: () => apiRequest(`${base}/`).then((r) => ({ items: r.data.items, layout: r.data.layout })),
  one: (id) => apiRequest(`${base}/${encodeURIComponent(id)}/`).then((r) => r.data.item),

  /* putAway, list, discount, promote, refurbish, donate, snooze, receiveBack, dispatch */
  action: (id, key, body = {}) =>
    apiRequest(`${base}/${encodeURIComponent(id)}/actions/${key}/`, {
      method: "POST",
      body,
    }).then((r) => r.data.item),

  /* the same action on several lots -> { done: [ids], failed: [{ id, message }], items } */
  bulk: (ids, action, body = {}) =>
    apiRequest(`${base}/actions/`, {
      method: "POST",
      body: { ...body, ids, action },
    }).then((r) => r.data),

  /* stock bought from a User or ReMaker arrives at the dock */
  checkIn: (body) =>
    apiRequest(`${base}/`, { method: "POST", body }).then((r) => r.data.item),

  /* stock management: { list_price, quantity + reason, condition, location: {zone, rack, level} } */
  update: (id, body) =>
    apiRequest(`${base}/${encodeURIComponent(id)}/`, { method: "PATCH", body }).then(
      (r) => r.data.item,
    ),
};
