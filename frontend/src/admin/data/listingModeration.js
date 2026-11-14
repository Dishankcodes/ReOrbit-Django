/* Moderation actions an admin can take on a member listing (LST-…).
   The server keeps the state; see /api/listings/admin/<id>/moderate/ and /suggest-price/. */

export const LISTING_ACTIONS = {
  flag: {
    key: "flag",
    label: "Flag this listing",
    short: "Flag",
    tone: "warning",
    icon: "hide",
    needsReason: true,
    title: "Flag this listing?",
    body: "It stays on the marketplace, but the seller is told it needs attention. They can see your reason.",
    confirmLabel: "Flag listing",
    placeholder: "Tell the seller what to fix...",
    toast: "was flagged",
    status: "Flagged",
  },
  disable: {
    key: "disable",
    label: "Disable this listing",
    short: "Disable",
    tone: "danger",
    icon: "ban",
    needsReason: true,
    title: "Disable this listing?",
    body: "Buyers can no longer see or buy it. The seller is told why, and can't put it live again until you enable it.",
    confirmLabel: "Disable listing",
    placeholder: "Explain why this listing should be disabled...",
    toast: "was disabled",
    status: "Disabled",
  },
  enable: {
    key: "enable",
    label: "Enable this listing",
    short: "Enable",
    tone: "positive",
    icon: "restore",
    needsReason: false,
    title: "Enable this listing?",
    body: "The flag or switch-off is removed. A live listing is visible to buyers again.",
    confirmLabel: "Enable listing",
    toast: "is back to normal",
    status: "Normal",
  },
};

/* What can be done in each moderation state. */
export const actionsFor = (moderation) =>
  moderation === "Disabled"
    ? [LISTING_ACTIONS.enable]
    : moderation === "Flagged"
      ? [LISTING_ACTIONS.enable, LISTING_ACTIONS.disable]
      : [LISTING_ACTIONS.flag, LISTING_ACTIONS.disable];

export const ITEM_STATUS_LABEL = {
  Draft: "Draft",
  Listed: "Live",
  Reserved: "Reserved",
  Sold: "Sold",
  Donated: "Donated",
  Withdrawn: "Withdrawn",
  Warehouse: "In warehouse",
};
