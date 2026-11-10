/* =========================================================
   Shared > Categories.
   One list for the whole site, managed in Admin > Content. It comes from the public
   endpoint, so members, ReMakers and admins all see the same visible categories.
   ========================================================= */

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/api";

let cache = null;
let inflight = null;
let loadedAt = 0;
const listeners = new Set();
const TTL = 60 * 1000;

function load(force = false) {
  if (!force && cache && Date.now() - loadedAt < TTL) return Promise.resolve(cache);
  if (!inflight) {
    inflight = apiRequest("/marketplace/categories/", { auth: false })
      .then((r) => {
        cache = (r.data.categories || []).map((c) => ({
          id: c.public_id, name: c.name, icon: c.icon || "Package", blurb: c.description || "", active: true,
        }));
        loadedAt = Date.now();
        listeners.forEach((l) => l(cache));
        return cache;
      })
      .catch(() => cache || [])
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/* Admin calls this after it changes a category so the pickers refresh straight away. */
export const refreshCategories = () => load(true);

export function useCategoryList() {
  const [list, setList] = useState(cache || []);
  useEffect(() => {
    listeners.add(setList);
    load().then(setList);
    return () => listeners.delete(setList);
  }, []);
  return list;
}
export const useCategoryNames = () => {
  const list = useCategoryList();
  return useMemo(() => list.map((c) => c.name), [list]);
};
