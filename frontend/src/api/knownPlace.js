import { apiRequest } from "./api";
import { fetchProfile } from "./profile";

/* The member's or ReMaker's city and pincode, wherever they already gave it: the profile first, then
   the default (or first) saved delivery address. Forms use it to fill these in for them; they can
   still change it. Cached for the page session; call forgetKnownPlace() after the profile changes. */
let cache = {};

export function forgetKnownPlace() {
  cache = {};
}

export function loadKnownPlace(type = "user") {
  if (!cache[type]) {
    cache[type] = (async () => {
      let city = "";
      let pincode = "";
      let address = "";
      try {
        const { profile } = await fetchProfile(type);
        city = profile?.city || "";
        pincode = profile?.pincode || "";
        address = profile?.address || "";
      } catch {
        /* fall through to the saved addresses */
      }
      if (!city || !pincode || !address) {
        try {
          const r = await apiRequest("/orders/addresses/");
          const list = r.data.addresses || [];
          const a = list.find((x) => x.is_default) || list[0];
          if (a) {
            city = city || a.city || "";
            pincode = pincode || a.pincode || "";
            address = address || [a.line1, a.line2, a.landmark].filter(Boolean).join(", ");
          }
        } catch {
          /* nothing saved yet */
        }
      }
      return { city, pincode, address };
    })();
  }
  return cache[type];
}
