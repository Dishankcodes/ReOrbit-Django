/* =========================================================
   Account actions an admin can take on a user (or ReMaker).
   Statuses follow the database ENUM:
   Active | Suspended | Blocked | Deleted
   ========================================================= */

export const ACCOUNT_STATUSES = ["Active", "Suspended", "Blocked", "Deleted"];

const ACTIONS = {
  activate: {
    key: "activate",
    label: "Reactivate account",
    short: "Reactivate",
    newStatus: "Active",
    tone: "positive",
    icon: "restore",
    needsReason: false,
    title: "Reactivate this account?",
    body: "The account will be set to Active and the person can sign in and use ReOrbit again.",
    confirmLabel: "Reactivate",
  },
  unblock: {
    key: "unblock",
    label: "Unblock account",
    short: "Unblock",
    newStatus: "Active",
    tone: "positive",
    icon: "restore",
    needsReason: false,
    title: "Unblock this account?",
    body: "The block will be lifted and the account returns to Active.",
    confirmLabel: "Unblock",
  },
  restore: {
    key: "restore",
    label: "Restore account",
    short: "Restore",
    newStatus: "Active",
    tone: "positive",
    icon: "restore",
    needsReason: false,
    title: "Restore this deleted account?",
    body: "The account and its history will come back and be set to Active.",
    confirmLabel: "Restore",
  },
  suspend: {
    key: "suspend",
    label: "Suspend account",
    short: "Suspend",
    newStatus: "Suspended",
    tone: "warning",
    icon: "pause",
    needsReason: true,
    title: "Suspend this account?",
    body: "A suspended account is temporarily unable to sign in, list items or place orders. You can reactivate it any time.",
    confirmLabel: "Suspend",
  },
  block: {
    key: "block",
    label: "Block account",
    short: "Block",
    newStatus: "Blocked",
    tone: "danger",
    icon: "ban",
    needsReason: true,
    title: "Block this account?",
    body: "Blocking is a stronger action meant for policy violations or fraud. The person is signed out everywhere and cannot return until unblocked.",
    confirmLabel: "Block account",
  },
  delete: {
    key: "delete",
    label: "Delete account",
    short: "Delete",
    newStatus: "Deleted",
    tone: "danger",
    icon: "trash",
    needsReason: true,
    title: "Delete this account?",
    body: "The account is marked as Deleted and hidden from the platform. Records are kept for order and donation history and the account can be restored.",
    confirmLabel: "Delete account",
  },
};

export const ACTION_LIST = ACTIONS;

/* Which actions make sense for each status. */
export function getAvailableActions(status) {
  switch (status) {
    case "Active":
      return [ACTIONS.suspend, ACTIONS.block, ACTIONS.delete];
    case "Suspended":
      return [ACTIONS.activate, ACTIONS.block, ACTIONS.delete];
    case "Blocked":
      return [ACTIONS.unblock, ACTIONS.delete];
    case "Deleted":
      return [ACTIONS.restore];
    default:
      return [];
  }
}

/* For bulk actions: an action key is allowed on a user only if it is
   in that user's available list. */
export function canApply(status, actionKey) {
  return getAvailableActions(status).some((action) => action.key === actionKey);
}
