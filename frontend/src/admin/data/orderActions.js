/* =========================================================
   What an admin can do with an order.
   Status values follow the database ENUM:
     order_status   Pending | Confirmed | Cancelled | Completed | Returned
     payment_status Pending | Success | Failed | Refunded
   ========================================================= */

const ACTIONS = {
  markPaid: {
    key: "markPaid",
    label: "Mark payment received",
    short: "Mark paid",
    tone: "positive",
    icon: "paid",
    needsReason: false,
    title: "Mark this order as paid?",
    body: "Use this when the money has reached ReOrbit but the payment gateway has not updated yet. The payment status becomes Success.",
    confirmLabel: "Mark as paid",
    toast: "marked as paid",
  },
  confirm: {
    key: "confirm",
    label: "Confirm order",
    short: "Confirm",
    tone: "positive",
    icon: "check",
    needsReason: false,
    title: "Confirm this order?",
    body: "The seller is told to prepare the order and the buyer gets a confirmation.",
    confirmLabel: "Confirm order",
    toast: "confirmed",
  },
  complete: {
    key: "complete",
    label: "Mark as completed",
    short: "Complete",
    tone: "positive",
    icon: "done",
    needsReason: false,
    title: "Mark this order as completed?",
    body: "Use this once the buyer has received everything. For cash on delivery, the payment is also marked as collected.",
    confirmLabel: "Mark completed",
    toast: "completed",
  },
  cancel: {
    key: "cancel",
    label: "Cancel order",
    short: "Cancel",
    tone: "danger",
    icon: "ban",
    needsReason: true,
    title: "Cancel this order?",
    body: "Both sides are told the order was cancelled. If the buyer has already paid, a refund will be due.",
    confirmLabel: "Cancel order",
    reasonHint: "kept in the order timeline",
    placeholder: "e.g. Buyer asked to cancel before dispatch",
    toast: "cancelled",
  },
  return: {
    key: "return",
    label: "Mark as returned",
    short: "Return",
    tone: "warning",
    icon: "undo",
    needsReason: true,
    title: "Mark this order as returned?",
    body: "Use this when a completed order is sent back, for example the item was not as described. A refund will be due.",
    confirmLabel: "Mark returned",
    reasonHint: "kept in the order timeline",
    placeholder: "e.g. Item did not match the listing photos",
    toast: "marked as returned",
  },
  refund: {
    key: "refund",
    label: "Issue refund",
    short: "Refund",
    tone: "warning",
    icon: "refund",
    needsReason: false,
    title: "Issue the refund for this order?",
    body: "The full amount goes back to the buyer’s original payment method and the payment status becomes Refunded.",
    confirmLabel: "Issue refund",
    toast: "refunded",
  },
};

export const ORDER_ACTION_LIST = ACTIONS;

/* Which actions make sense for an order right now. */
export function getOrderActions(order) {
  const { order_status: status, transaction } = order;
  const pay = transaction.payment_status;
  const isCod = transaction.payment_method === "COD";
  const list = [];

  if (["Pending", "Confirmed"].includes(status) && pay === "Pending" && !isCod) list.push(ACTIONS.markPaid);
  if (status === "Pending" && (pay === "Success" || (isCod && pay === "Pending"))) list.push(ACTIONS.confirm);
  if (status === "Confirmed") list.push(ACTIONS.complete);
  if (["Pending", "Confirmed"].includes(status)) list.push(ACTIONS.cancel);
  if (status === "Completed") list.push(ACTIONS.return);
  if (["Cancelled", "Returned"].includes(status) && pay === "Success") list.push(ACTIONS.refund);
  return list;
}

export const canApplyOrderAction = (order, key) => getOrderActions(order).some((a) => a.key === key);
