/* =========================================================
   Shared › Categories.
   One list for the whole site, edited in Admin › Content.
   Inactive categories are hidden from pickers.
   ========================================================= */

import { useMemo } from "react";
import { useCategories } from "../admin/data/contentStore";

export function useCategoryList() {
  const all = useCategories();
  return useMemo(() => all.filter((c) => c.active), [all]);
}
export const useCategoryNames = () => {
  const list = useCategoryList();
  return useMemo(() => list.map((c) => c.name), [list]);
};
