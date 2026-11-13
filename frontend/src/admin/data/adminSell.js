/* =========================================================
   Admin › Sell products: the choices on the listing form.
   (Listings, sales and numbers come from the server; see sellStore.js.
   These two lists match what the backend accepts.)
   ========================================================= */

export const SELL_CONDITIONS = [
  "Like new",
  "Good",
  "Fair",
  "Refurbished",
  "Brand new",
];
export const SELL_SOURCES = {
  warehouse: {
    label: "Warehouse stock",
    hint: "Pre-owned stock held in the ReOrbit warehouse.",
  },
  refurbished: {
    label: "Refurbished",
    hint: "Restored by a ReMaker with care.",
  },
  other: {
    label: "Other / new",
    hint: "Anything else the platform wants to sell.",
  },
};
