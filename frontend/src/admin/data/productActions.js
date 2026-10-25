/* =========================================================
   Moderation actions an admin can take on a listing.
   - Community items (uploaded by Users) are verified or rejected.
   - ReMaker products are deactivated or reactivated.
   ========================================================= */

const ACTIONS = {
  verify: {
    key: "verify",
    label: "Verify & list",
    short: "Verify",
    tone: "positive",
    icon: "check",
    needsReason: false,
    title: "Verify this item?",
    body: "The item is marked Verified and goes live on the marketplace.",
    confirmLabel: "Verify item",
    toast: "verified and listed",
  },
  reject: {
    key: "reject",
    label: "Reject listing",
    short: "Reject",
    tone: "danger",
    icon: "ban",
    needsReason: true,
    title: "Reject this item?",
    body: "The owner is told the item was rejected, together with your message. They can fix the listing and upload it again.",
    confirmLabel: "Reject item",
    toast: "rejected",
  },
  deactivate: {
    key: "deactivate",
    label: "Deactivate product",
    short: "Deactivate",
    tone: "warning",
    icon: "hide",
    needsReason: true,
    title: "Deactivate this product?",
    body: "The product is removed from the marketplace until you reactivate it. The ReMaker can see your reason.",
    confirmLabel: "Deactivate",
    toast: "deactivated",
  },
  reactivate: {
    key: "reactivate",
    label: "Reactivate product",
    short: "Reactivate",
    tone: "positive",
    icon: "restore",
    needsReason: false,
    title: "Reactivate this product?",
    body: "The product is listed on the marketplace again.",
    confirmLabel: "Reactivate",
    toast: "listed again",
  },
};

export const PRODUCT_ACTION_LIST = ACTIONS;

/* Which actions apply to a listing in its current state. */
export function getProductActions(product) {
  if (product.type === "item") {
    if (product.verification === "Pending")
      return [ACTIONS.verify, ACTIONS.reject];
    if (product.verification === "Rejected") return [ACTIONS.verify];
    if (
      product.verification === "Verified" &&
      ["Listed", "Reserved"].includes(product.rawStatus)
    )
      return [ACTIONS.reject];
    return [];
  }
  if (product.rawStatus === "Listed") return [ACTIONS.deactivate];
  if (product.rawStatus === "Inactive") return [ACTIONS.reactivate];
  return [];
}

export const canApplyProductAction = (product, key) =>
  getProductActions(product).some((action) => action.key === key);
