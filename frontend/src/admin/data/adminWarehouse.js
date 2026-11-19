/* =========================================================
   Admin › Warehouse — the floor plan.
   The server is the source (GET /api/warehouse/admin/ returns `layout`, built in
   backend/apps/warehouse/services.py): two floors, each with one area per marketplace
   category (plus "Other items"), so a zone is floor + area ("1A" = Floor 1, the first category). Donated items go to Floor 1, bought stock
   to Floor 2. Nothing is assumed here: until the server answers, the screens show
   "Loading the floor plan" (or an error with Try again), never made-up capacities.
   ========================================================= */

/* every zone with its floor, flat: [{ key: "1A", name, capacity, floor: { key, name, note } }] */
export const zonesOf = (layout) =>
  (layout?.floors || []).flatMap((f) =>
    f.zones.map((z) => ({ ...z, floor: { key: f.key, name: f.name, note: f.note } })),
  );

/* The dock (DOCK) and the QC / refurbishment bay (QC) sit outside the racks. */
