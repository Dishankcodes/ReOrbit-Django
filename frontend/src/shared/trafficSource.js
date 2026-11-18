/* Tells the server where a shopper came from when they open a ReMaker's product or
   profile, so the Analytics page can show "where shoppers find you".
   Nothing about the person is sent: just what was viewed and the kind of page before it. */

import { analyticsApi } from "../api/analytics";
import { cameFrom } from "./backNav";

const SEEN_KEY = "reorbit_viewed";

/* "/user-marketplace/remaker/RMK-1001" -> "marketplace/remaker/RMK-1001" in any portal */
const bare = (path) =>
  String(path || "")
    .split(/[?#]/)[0]
    .replace(/^\/(user|remaker|admin)-/, "");

export function sourceFrom(previousPath) {
  if (!previousPath) return "link"; /* opened from a link, a bookmark or a new tab */
  const path = bare(previousPath);
  if (/^marketplace\/(remaker|seller)\//.test(path)) return "profile";
  if (/^marketplace\/?$/.test(path)) return "marketplace";
  if (/^following\/?/.test(path)) return "feed";
  return "other";
}

/* Each product or profile counts once per browser session, so a refresh does not inflate it. */
function firstTime(key) {
  try {
    const seen = JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]");
    if (seen.includes(key)) return false;
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, key].slice(-200)));
  } catch {
    /* private window: count it */
  }
  return true;
}

const here = () => window.location.pathname + window.location.search;

/* Every product page counts: member listings (LST-), ReMaker creations (RPR-), ReOrbit store (ADI-). */
export function trackProductView(id) {
  if (!/^(RPR|LST|ADI)-/.test(String(id || "")) || !firstTime(`p:${id}`)) return;
  analyticsApi.recordView({
    type: "product",
    id,
    source: sourceFrom(cameFrom(here())),
  });
}

export function trackProfileView(id) {
  if (!String(id || "").startsWith("RMK-") || !firstTime(`m:${id}`)) return;
  analyticsApi.recordView({ type: "profile", id });
}
