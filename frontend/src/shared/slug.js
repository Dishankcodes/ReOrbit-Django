/* =========================================================
   Readable addresses: the name first, the ID last.

     /user-marketplace/product/teak-table-RPR-1001
     /user-marketplace/seller/asha-shah-USR-1004
     /user-marketplace/remaker/messy-mirror-RMK-1001

   The ID at the end is what the server looks up, so two things with the same name never
   clash and a renamed product still opens. Old links (/product/RPR-1001) keep working: the
   page reads the ID with idFrom() and quietly replaces the address with the readable one.
   The paths are written with /user-… and portalRouter turns them into the ReMaker
   (/remaker-marketplace/…) or admin (/admin-shop/…) address automatically.
   ========================================================= */

const ID_AT_END = /([A-Za-z]{2,4}-\d+)$/;

/* "Teak Table (Restored) – 1970s!" -> "teak-table-restored-1970s" */
export function slugify(name = "") {
  return String(name)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // accents off
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/* ("RPR-1001", "Teak table") -> "teak-table-RPR-1001"; no usable name -> just the ID */
export function withSlug(id, name) {
  if (!id) return "";
  const s = slugify(name);
  return s ? `${s}-${id}` : String(id);
}

/* the part of the address after /product/ (or /seller/, /remaker/) -> the ID the server knows */
export function idFrom(param = "") {
  let raw = String(param || "");
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* already plain */
  }
  const m = raw.match(ID_AT_END);
  return m ? m[1].toUpperCase() : raw;
}

export const productPath = (id, name) => `/user-marketplace/product/${withSlug(id, name)}`;
export const sellerPath = (id, name) => `/user-marketplace/seller/${withSlug(id, name)}`;
export const remakerPath = (id, name) => `/user-marketplace/remaker/${withSlug(id, name)}`;
/* a member or a ReMaker, from a seller type */
export const personPath = (type, id, name) =>
  String(type).toLowerCase() === "remaker" ? remakerPath(id, name) : sellerPath(id, name);
