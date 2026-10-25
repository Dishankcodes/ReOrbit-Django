/* =========================================================
   Actions an admin can take on a pickup request.
   Pickup_Requests status: Requested -> Scheduled -> Picked_Up -> Completed
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
    fields: "none",
    title: "Mark this pickup as picked up?",
    body: "The pickup team collected the item from the customer.",
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

export const PICKUP_ACTION_LIST = A;

export function getPickupActions(p) {
  switch (p.status) {
    case "Requested":
      return p.type === "Donation"
        ? [A.schedule, A.cancel]
        : [A.schedule, A.cancel];
    case "Scheduled":
      return [A.pickedUp, A.reschedule, A.cancel];
    case "Picked_Up":
      return [A.complete];
    case "Cancelled":
      return [A.reopen];
    default:
      return [];
  }
}
export const canApplyPickupAction = (p, key) =>
  getPickupActions(p).some((a) => a.key === key);
