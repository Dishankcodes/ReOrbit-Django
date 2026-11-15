/* =========================================================
   Admin › Warehouse — the fixed layout of our warehouse.
   Only the floor plan lives here (zones and the address printed on labels).
   Stock, history and alerts all come from the server through warehouseStore.js,
   and the zone list below mirrors ZONES in backend/apps/warehouse/services.py.
   ========================================================= */

export const ZONES = [
  { key: "A", name: "Furniture hall", capacity: 60 },
  { key: "B", name: "Home & kitchen", capacity: 48 },
  { key: "C", name: "Textiles & clothing", capacity: 56 },
  { key: "D", name: "Electronics & books", capacity: 36 },
  { key: "E", name: "Sports & misc", capacity: 24 },
];

/* The dock (DOCK) and the QC / refurbishment bay (QC) sit outside the racks. */
export const WAREHOUSE_ADDRESS =
  "Plot 14, Orbit Industrial Park, Sarkhej, Ahmedabad 382210";
