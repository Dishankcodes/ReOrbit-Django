import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/* Every new page opens at the top (public pages had no layout doing this, so a click halfway
   down the home page landed halfway down the next page). Links to an #anchor still jump to it. */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" }); // not smooth: the new page just starts at the top
  }, [pathname, hash]);
  return null;
}
