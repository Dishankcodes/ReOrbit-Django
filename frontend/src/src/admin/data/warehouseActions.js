/* =========================================================
   Actions an admin can take on warehouse stock.
   ========================================================= */

const A = {
  putAway: { key: "putAway", label: "Put away on shelf", short: "Put away", tone: "positive", icon: "check", needsReason: false,
    title: "Put this item away?", body: "A shelf location is assigned and the item is marked Stored.", confirmLabel: "Put away", toast: "stored on a shelf" },
  list: { key: "list", label: "List for sale", short: "List for sale", tone: "positive", icon: "paid", needsReason: false,
    title: "List this item for sale?", body: "The item goes live on the marketplace and the 7-day unsold timer starts.", confirmLabel: "List item", toast: "listed for sale" },
  discount: { key: "discount", label: "Cut price by 15%", short: "Cut price 15%", tone: "warning", icon: "tag", needsReason: false,
    title: "Cut the price by 15%?", body: "The price drops by 15% and the unsold timer starts again, so the item is judged afresh over the next 7 days.", confirmLabel: "Cut price", toast: "price cut by 15%" },
  promote: { key: "promote", label: "Promote on homepage", short: "Promote", tone: "positive", icon: "spark", needsReason: false,
    title: "Promote this item?", body: "The item is featured on the marketplace homepage for 7 days and the alert is paused for that time.", confirmLabel: "Promote", toast: "promoted for 7 days" },
  refurbish: { key: "refurbish", label: "Send to refurbishment", short: "Refurbish", tone: "warning", icon: "wrench", needsReason: false,
    title: "Send this item to refurbishment?", body: "It is taken off sale and assigned to the best-matching ReMaker. It returns to the shelf when the work is done.", confirmLabel: "Send to ReMaker", toast: "sent to refurbishment" },
  donate: { key: "donate", label: "Donate to NGO", short: "Donate", tone: "danger", icon: "gift", needsReason: true, reasonHint: "which NGO or drive, shown in the item history", placeholder: "e.g. Handed to Asha Kiran Trust for the winter drive",
    title: "Donate this item?", body: "The item is removed from sale and leaves the warehouse as a donation. This cannot be undone.", confirmLabel: "Donate item", toast: "marked as donated" },
  snooze: { key: "snooze", label: "Snooze alert 3 days", short: "Snooze alert", tone: "positive", icon: "bell-off", needsReason: false,
    title: "Snooze this alert?", body: "No alert for this item for 3 days. It comes back if the item still has not sold.", confirmLabel: "Snooze", toast: "alert snoozed for 3 days" },
  receiveBack: { key: "receiveBack", label: "Receive back from ReMaker", short: "Receive back", tone: "positive", icon: "check", needsReason: false,
    title: "Receive this item back?", body: "The refurbished item passes quality check and returns to the shelf, ready to list.", confirmLabel: "Receive back", toast: "received back and stored" },
  dispatch: { key: "dispatch", label: "Release for dispatch", short: "Dispatch", tone: "positive", icon: "truck", needsReason: false,
    title: "Release this item for dispatch?", body: "The item leaves the warehouse with the courier for its buyer.", confirmLabel: "Release", toast: "released for dispatch" },
};

export const WAREHOUSE_ACTION_LIST = A;

export function getWarehouseActions(item) {
  const s = item.warehouse_status;
  if (s === "Received") return [A.putAway];
  if (s === "Assigned") return [A.dispatch];
  if (s === "Refurbishment") return [A.receiveBack];
  if (s === "Stored" && item.sale_status === "Not listed") return [A.list, A.refurbish, A.donate];
  if (s === "Stored" && item.sale_status === "Listed") {
    const list = [];
    if (item.alert) list.push(A.discount, A.promote, A.refurbish, A.donate, A.snooze);
    else list.push(A.discount, A.promote, A.refurbish, A.donate);
    return list;
  }
  return [];
}

export const canApplyWarehouseAction = (item, key) => getWarehouseActions(item).some((a) => a.key === key);
