/* =========================================================
   Shared › Public content (FAQs, policies, banners).
   Written in Admin › Content, read by the public site, the
   user app and the ReMaker app.
   ========================================================= */

import { useMemo } from "react";
import { useBanners, useFaqs, usePolicies, fillTokens } from "../admin/data/contentStore";
import { useCommerce } from "./commerce";
import { useSettings } from "../admin/data/settingsStore";

export const usePublishedFaqs = () => {
  const all = useFaqs();
  return useMemo(() => all.filter((f) => f.published !== false), [all]);
};

/* placement: "Home hero" etc. (see BANNER_PLACEMENTS). audience: who is looking. */
export function useLiveBanners(placement, viewer = "Visitors only") {
  const all = useBanners();
  return useMemo(
    () =>
      all.filter(
        (b) =>
          b.status === "Live" &&
          (!placement || b.placement === placement) &&
          (b.audience === "Everyone" || b.audience === viewer),
      ),
    [all, placement, viewer],
  );
}

/* The live version of a policy with {tokens} filled from Settings. */
export function usePolicyText(key) {
  const policies = usePolicies();
  const commerce = useCommerce();
  const { warehouse } = useSettings();
  const p = policies.find((x) => x.key === key);
  return useMemo(() => {
    if (!p) return null;
    return { ...p, body: fillTokens(p.body, commerce, warehouse) };
  }, [p, commerce, warehouse]);
}
