/* =========================================================
   Moderation actions an admin can take on a listing.
   - ReMaker products are deactivated or reactivated.
   - Community items go live as soon as the member publishes them. The team
     can switch one off, with a reason, from the product page.
   ========================================================= */

const ACTIONS = {
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
  if (product.type === "item") return [];
  if (product.rawStatus === "Listed") return [ACTIONS.deactivate];
  if (product.rawStatus === "Inactive") return [ACTIONS.reactivate];
  return [];
}

export const canApplyProductAction = (product, key) =>
  getProductActions(product).some((action) => action.key === key);
