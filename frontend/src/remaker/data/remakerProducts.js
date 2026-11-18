/* =========================================================
   ReMaker products: shared constants for the product screens.
   The products themselves come from the server (data/productsStore.js);
   the old sample product list that used to live here is gone.
   ========================================================= */

/* Fallback only. The forms read the live list from Admin > Content
   (see shared/catalog.js). */
export const CATEGORIES = [
  "Furniture",
  "Home Decor",
  "Lighting",
  "Storage & Organisers",
  "Garden & Planters",
  "Kitchen & Dining",
  "Fashion & Accessories",
  "Bags & Totes",
  "Jewellery",
  "Wall Art",
  "Stationery & Books",
  "Kids & Toys",
  "Electronics Reborn",
  "Pet Supplies",
];

export const MATERIAL_SUGGESTIONS = [
  "Reclaimed wood",
  "Teak",
  "Denim",
  "Brass",
  "Glass",
  "Cotton",
  "Metal scrap",
  "Ceramic",
  "Leather",
  "Jute",
];

/* Items the ReMaker bought on ReOrbit (Items.item_id) */

export const PRODUCT_STATUS = {
  Listed: { label: "Active", tone: "active" },
  Inactive: { label: "Inactive", tone: "inactive" },
  Draft: { label: "Draft", tone: "draft" },
  Sold_Out: { label: "Sold out", tone: "soldout" },
};



export function formatPrice(value) {
  const amount = Number(value);

  if (!amount || Number.isNaN(amount)) {
    return "₹0";
  }

  return `₹${amount.toLocaleString("en-IN")}`;
}
