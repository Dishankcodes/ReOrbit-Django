import React from "react";
import { CategoryIcon } from "../../../../shared/categoryIcons";
import { useCategoryList } from "../../../../shared/catalog";

/* The icon the admin chose for this category (Admin › Content › Categories).
   A category the admin has since removed falls back to the plain package icon. */
export function CategoryGlyph({ name, size = 16 }) {
  const list = useCategoryList();
  const found = list.find((c) => c.id === name || c.name === name);
  return <CategoryIcon name={found?.icon || "Package"} size={size} />;
}
