import { useCallback, useEffect, useState } from "react";

const KEY = "reorbit_remaker_wishlist";

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/* Saved listings, kept in the browser until the Wishlist API exists */
export default function useWishlist() {
  const [ids, setIds] = useState(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* storage unavailable, keep going in memory */
    }
  }, [ids]);

  const toggle = useCallback((id) => {
    setIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }, []);

  const has = useCallback((id) => ids.includes(id), [ids]);

  return { ids, has, toggle };
}
