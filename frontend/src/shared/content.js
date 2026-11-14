/* =========================================================
   Shared › Public content (FAQs, policies, banners).
   Written in Admin › Content (/api/content/admin/...), read here from the
   public endpoints (/api/content/...) by the public site, the user app and the
   ReMaker app. Nothing is stored in the browser.
   ========================================================= */

import { useEffect, useMemo, useState } from "react";
import { fillTokens } from "../admin/data/contentStore";
import { publicContentApi } from "../api/adminContent";
import { useCommerce } from "./commerce";
import { useSettings } from "../admin/data/settingsStore";

/* One small fetch-and-keep cache per kind of content. */
function makeFeed(load, maxAgeMs = 60000) {
  const cache = new Map(); // key -> { at, rows, promise }
  const subs = new Set();
  const get = (key, ...args) => {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < maxAgeMs) return hit;
    if (hit?.promise) return hit;
    const entry = { at: Date.now(), rows: hit?.rows ?? null };
    entry.promise = load(...args)
      .then((rows) => {
        cache.set(key, { at: Date.now(), rows });
        subs.forEach((f) => f());
      })
      .catch(() => cache.set(key, { at: Date.now(), rows: hit?.rows ?? [] }));
    cache.set(key, entry);
    return entry;
  };
  const use = (key, ...args) => {
    const [, bump] = useState(0);
    useEffect(() => {
      const f = () => bump((n) => n + 1);
      subs.add(f);
      return () => subs.delete(f);
    }, []);
    return get(key, ...args).rows;
  };
  return { use };
}

const faqFeed = makeFeed(() => publicContentApi.faqs());
const policyFeed = makeFeed(() => publicContentApi.policies());
const bannerFeed = makeFeed((placement, audience) =>
  publicContentApi.banners(placement, audience),
);

export const usePublishedFaqs = () => {
  const rows = faqFeed.use("all");
  return useMemo(() => rows || [], [rows]);
};

const AUDIENCE_KEY = {
  "Visitors only": "visitor",
  "Signed-in members": "member",
  ReMakers: "remaker",
};

/* placement: "Home hero" etc. (see BANNER_PLACEMENTS). viewer: who is looking. */
export function useLiveBanners(placement, viewer = "Visitors only") {
  const audience = AUDIENCE_KEY[viewer] || "visitor";
  const rows = bannerFeed.use(`${placement}|${audience}`, placement, audience);
  return useMemo(() => rows || [], [rows]);
}

/* Counts one view per banner per page load, and every click. */
const seen = new Set();
export const trackBannerView = (id) => {
  if (seen.has(id)) return;
  seen.add(id);
  publicContentApi.count(id, "view");
};
export const trackBannerClick = (id) => publicContentApi.count(id, "click");

/* The live version of a policy with {tokens} filled from Settings.
   Returns null until it loads, or when the policy was never published. */
export function usePolicyText(key) {
  const policies = policyFeed.use("all");
  const commerce = useCommerce();
  const { warehouse } = useSettings();
  const p = (policies || []).find((x) => x.key === key);
  return useMemo(() => {
    if (!p) return null;
    return { ...p, body: fillTokens(p.body, commerce, warehouse) };
  }, [p, commerce, warehouse]);
}
