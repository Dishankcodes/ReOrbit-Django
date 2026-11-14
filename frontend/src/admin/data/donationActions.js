/* =========================================================
   Actions an admin can take on a donation.
   Flow: Pending -> Scheduled -> Picked_Up -> Received -> Completed
   A pending donation can also be Rejected (and brought back).
   `fields` tells the modal what to ask for.
   ========================================================= */

export const SLOTS = [
  "9:00 AM – 12:00 PM",
  "12:00 PM – 3:00 PM",
  "3:00 PM – 6:00 PM",
];
/* Old data stored “Pickup team A · Ravi Kumar”. Teams are now saved by name only. */
export const teamNameOf = (s) => (s ? String(s).split(" · ")[0].trim() : null);
export const PARTNERS = [
  "Pickup team A · Ravi Kumar",
  "Pickup team B · Imran Qureshi",
  "Pickup team C · Sunita Devi",
];
export const NGOS = [
  "Asha Kiran Trust",
  "Nayi Disha Foundation",
  "Jeevan Jyoti NGO",
  "Seva Sadan",
  "Udaan Welfare Society",
];
export const REJECT_CHIPS = [
  "Poor condition",
  "Category not accepted",
  "Outside pickup area",
  "Photos do not match",
];
export const FAILED_PICKUP_CHIPS = [
  "Donor was not home",
  "Wrong or incomplete address",
  "Donor asked to reschedule",
  "Gate or building access issue",
];
export const CONDITIONS = ["Good", "Medium", "Worst"];

const A = {
  accept: {
    key: "accept",
    label: "Accept & schedule pickup",
    short: "Accept",
    tone: "positive",
    icon: "check",
    fields: "schedule",
    title: "Accept this donation?",
    body: "The donor is told it was accepted. Choose when the free pickup will happen.",
    confirmLabel: "Accept & schedule",
    toast: "accepted and pickup scheduled",
  },
  reject: {
    key: "reject",
    label: "Reject donation",
    short: "Reject",
    tone: "danger",
    icon: "ban",
    fields: "reason",
    title: "Reject this donation?",
    body: "The donor is told it was not accepted, together with your reason.",
    confirmLabel: "Reject donation",
    toast: "rejected",
  },
  reschedule: {
    key: "reschedule",
    label: "Reschedule pickup",
    short: "Reschedule",
    tone: "warning",
    icon: "restore",
    fields: "schedule",
    title: "Reschedule the pickup?",
    body: "The donor gets the new date and time slot.",
    confirmLabel: "Reschedule",
    toast: "pickup rescheduled",
  },
  cancelPickup: {
    key: "cancelPickup",
    label: "Cancel & reject",
    short: "Cancel",
    tone: "danger",
    icon: "ban",
    fields: "reason",
    title: "Cancel the pickup and reject this donation?",
    body: "The pickup is cancelled and the donor is told why.",
    confirmLabel: "Cancel pickup",
    toast: "cancelled and rejected",
  },
  pickedUp: {
    key: "pickedUp",
    label: "Mark as picked up",
    short: "Picked up",
    tone: "positive",
    icon: "truck",
    fields: "code",
    title: "Mark this donation as picked up?",
    body: "Ask the donor to read out their 4-digit handover code and enter it below. This confirms the right item left with the right person.",
    confirmLabel: "Mark picked up",
    toast: "marked as picked up",
  },
  failed: {
    key: "failed",
    label: "Mark pickup as failed",
    short: "Failed pickup",
    tone: "danger",
    icon: "ban",
    fields: "reason",
    chips: "failed",
    title: "Mark this pickup attempt as failed?",
    body: "The donation is not rejected — the donor can pick a new date and we'll try again.",
    confirmLabel: "Mark as failed",
    toast: "marked as a failed pickup attempt",
  },
  received: {
    key: "received",
    label: "Mark as received",
    short: "Received",
    tone: "positive",
    icon: "stock",
    fields: "receive",
    title: "Mark this donation as received?",
    body: "Confirm what actually arrived at the warehouse. Leave a field blank to accept it as declared.",
    confirmLabel: "Mark received",
    toast: "marked as received",
  },
  complete: {
    key: "complete",
    label: "Complete & issue certificate",
    short: "Complete",
    tone: "positive",
    icon: "gift",
    fields: "ngo",
    title: "Complete this donation?",
    body: "Choose who receives it. The donor gets a donation certificate.",
    confirmLabel: "Complete donation",
    toast: "completed and certificate issued",
  },
  reopen: {
    key: "reopen",
    label: "Move back to pending",
    short: "Reopen",
    tone: "positive",
    icon: "restore",
    fields: "none",
    title: "Move this donation back to pending?",
    body: "It returns to the review queue so it can be accepted.",
    confirmLabel: "Move to pending",
    toast: "moved back to pending",
  },
};

export const DONATION_ACTION_LIST = A;

export function getDonationActions(d) {
  switch (d.status) {
    case "Pending":
      return [A.accept, A.reject];
    case "Scheduled":
      return [A.pickedUp, A.reschedule, A.cancelPickup, A.failed];
    case "Failed_Pickup":
      return [A.reschedule, A.cancelPickup];
    case "Picked_Up":
      return [A.received];
    case "Received":
      return [A.complete];
    case "Rejected":
      return [A.reopen];
    default:
      return [];
  }
}
export const canApplyDonationAction = (d, key) =>
  getDonationActions(d).some((a) => a.key === key);
