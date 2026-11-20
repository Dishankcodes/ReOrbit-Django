/* =========================================================
   Actions an admin can take on a pickup request.
   Pickup status: Requested -> Scheduled -> Picked_Up -> Completed
   (or Cancelled). `fields` tells the modal what to ask for and is the
   same shape the Donations modal understands.
   ========================================================= */

const A = {
  schedule: {
    key: "schedule",
    label: "Schedule pickup",
    short: "Schedule",
    tone: "positive",
    icon: "check",
    fields: "schedule",
    title: "Schedule this pickup?",
    body: "Choose the date, the time slot and who collects it. The customer is told right away.",
    confirmLabel: "Schedule pickup",
    toast: "scheduled",
  },
  reschedule: {
    key: "reschedule",
    label: "Reschedule / reassign",
    short: "Reschedule",
    tone: "warning",
    icon: "restore",
    fields: "schedule",
    title: "Reschedule this pickup?",
    body: "Pick a new date, slot or pickup team. The customer gets the update.",
    confirmLabel: "Reschedule",
    toast: "rescheduled",
  },
  pickedUp: {
    key: "pickedUp",
    label: "Mark as picked up",
    short: "Picked up",
    tone: "positive",
    icon: "truck",
    fields: "code",
    codeWho: "Customer's",
    title: "Mark this pickup as picked up?",
    body: "Ask the customer for the 4-digit handover code they see in the app and enter it below. After 5 wrong codes the pickup locks until you reschedule it.",
    confirmLabel: "Mark picked up",
    toast: "marked as picked up",
  },
  complete: {
    key: "complete",
    label: "Mark delivered to warehouse",
    short: "Complete",
    tone: "positive",
    icon: "stock",
    fields: "none",
    title: "Complete this pickup?",
    body: "The item reached the warehouse and was checked in. The pickup is closed.",
    confirmLabel: "Complete pickup",
    toast: "completed",
  },
  cancel: {
    key: "cancel",
    label: "Cancel pickup",
    short: "Cancel",
    tone: "danger",
    icon: "ban",
    fields: "reason",
    title: "Cancel this pickup?",
    body: "The pickup is cancelled and the customer is told why.",
    confirmLabel: "Cancel pickup",
    toast: "cancelled",
  },
  reopen: {
    key: "reopen",
    label: "Reopen request",
    short: "Reopen",
    tone: "positive",
    icon: "restore",
    fields: "none",
    title: "Reopen this pickup?",
    body: "It goes back to Requested so it can be scheduled again.",
    confirmLabel: "Reopen",
    toast: "reopened",
  },
};

/* Donation pickups carry the same checks as the Donations screen: the donor's handover code
   proves who handed the item over, and the warehouse count decides the reward. */
const DONATION = {
  pickedUp: {
    ...A.pickedUp,
    fields: "code",
    codeWho: "Donor's",
    body: "Ask the donor to read out their 4-digit handover code and enter it below. This confirms the right item left with the right person. After 5 wrong codes the pickup locks until you reschedule it.",
  },
  complete: {
    ...A.complete,
    fields: "receive",
    title: "Mark this donation as received?",
    body: "Record what actually reached the warehouse. The donor's points and voucher are based on it.",
    confirmLabel: "Mark received",
  },
  reopen: {
    ...A.reopen,
    body: "It goes back to under review so it can be scheduled again.",
  },
};

/* Order pickups ("Managed by ReOrbit"): collected from the seller and delivered to the buyer.
   Picked up ships the order; completing it marks the order delivered. */
const ORDER = {
  pickedUp: {
    ...A.pickedUp,
    label: "Mark picked up from seller",
    fields: "courier",
    needsCode: true,
    codeWho: "Seller's",
    title: "Picked up from the seller?",
    body: "Ask the seller for the 4-digit handover code on their order page. The order is then marked as shipped and the buyer is told. Add a partner courier's tracking number if you handed it on.",
    toast: "marked as picked up · order shipped",
  },
  complete: {
    ...A.complete,
    label: "Mark delivered to buyer",
    icon: "check",
    title: "Delivered to the buyer?",
    body: "The order is marked as delivered. The seller's earning starts clearing; the delivery fee stays with ReOrbit.",
    confirmLabel: "Mark delivered",
    toast: "completed · order delivered",
  },
};

export const PICKUP_ACTION_LIST = A;

export function getPickupActions(p) {
  const donation = p.type === "Donation";
  const order = p.type === "Order";
  switch (p.status) {
    case "Requested":
      return [A.schedule, A.cancel];
    case "Scheduled":
      /* a missed donation pickup can only be re-booked or called off */
      if (donation && p.donationStatus === "Failed_Pickup")
        return [A.reschedule, A.cancel];
      return [donation ? DONATION.pickedUp : order ? ORDER.pickedUp : A.pickedUp, A.reschedule, A.cancel];
    case "Picked_Up":
      return [donation ? DONATION.complete : order ? ORDER.complete : A.complete];
    case "Cancelled":
      /* only a donation the admin rejected can be brought back; the donor's own cancel is final */
      if (donation) return p.donationStatus === "Rejected" ? [DONATION.reopen] : [];
      return [A.reopen];
    default:
      return [];
  }
}
export const canApplyPickupAction = (p, key) =>
  getPickupActions(p).some((a) => a.key === key);
