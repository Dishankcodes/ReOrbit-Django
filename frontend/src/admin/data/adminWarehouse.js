/* =========================================================
   Admin › Warehouse — the floor plan.
   The server is the source (GET /api/warehouse/admin/ returns `layout`, built in
   backend/apps/warehouse/services.py): two floors, each with five areas, so a zone is
   floor + area ("1A" = Floor 1, Furniture hall). Donated items go to Floor 1, bought stock
   to Floor 2. The copy below is only used until the first answer arrives.
   ========================================================= */

const AREAS = [
  ["A", "Furniture hall", 60],
  ["B", "Home & kitchen", 48],
  ["C", "Textiles & clothing", 56],
  ["D", "Electronics & books", 36],
  ["E", "Sports & misc", 24],
];

export const FALLBACK_LAYOUT = {
  floors: [
    ["1", "Floor 1", "Donated items"],
    ["2", "Floor 2", "Bought stock"],
  ].map(([key, name, note]) => ({
    key,
    name,
    note,
    zones: AREAS.map(([area, zname, capacity]) => ({
      key: `${key}${area}`,
      area,
      name: zname,
      capacity,
    })),
  })),
  racks: 8,
  levels: 4,
  qc_bays: 4,
  address: "",
};

/* every zone with its floor, flat: [{ key: "1A", name, capacity, floor: { key, name, note } }] */
export const zonesOf = (layout) =>
  (layout?.floors || []).flatMap((f) =>
    f.zones.map((z) => ({ ...z, floor: { key: f.key, name: f.name, note: f.note } })),
  );

/* The dock (DOCK) and the QC / refurbishment bay (QC) sit outside the racks. */
