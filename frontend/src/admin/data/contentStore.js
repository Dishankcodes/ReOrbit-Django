/* =========================================================
   Admin › Content store.
   Categories, banners, FAQs and policies all live in the backend:
     /api/core/admin/categories/   /api/content/admin/...
   Nothing here is seeded. The store loads on first use, applies each change on
   screen at once, then confirms it with the server (and puts the screen back,
   with the server's message, if the server says no).
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { adminCategoryApi } from "../../api/adminCategories";
import { adminContentApi } from "../../api/adminContent";
import { refreshCategories } from "../../shared/catalog";

export const CATEGORY_ICON_KEYS = [
  "Armchair",
  "Home",
  "CookingPot",
  "Shirt",
  "Smartphone",
  "BookOpen",
  "Dumbbell",
  "Lamp",
  "Gem",
  "Baby",
  "Bike",
  "Music",
  "Camera",
  "Watch",
  "Flower2",
  "Hammer",
  "Gamepad2",
  "Backpack",
  "Package",
];

export const BANNER_PLACEMENTS = [
  {
    key: "Home hero",
    blurb: "The big slider at the top of the Home page.",
    max: 4,
    ratio: "16 : 6",
  },
  {
    key: "Home strip",
    blurb: "A slim promo bar under the hero.",
    max: 2,
    ratio: "16 : 2",
  },
  {
    key: "Shop top",
    blurb: "Above the product grid in the marketplace.",
    max: 2,
    ratio: "16 : 4",
  },
];
export const BANNER_AUDIENCES = [
  "Everyone",
  "Signed-in members",
  "Visitors only",
  "ReMakers",
];
export const BANNER_IMAGES = [
  {
    src: "https://images.pexels.com/photos/1148955/pexels-photo-1148955.jpeg?auto=compress&cs=tinysrgb&w=1000",
    label: "Vintage chair",
  },
  {
    src: "https://images.pexels.com/photos/34658646/pexels-photo-34658646.jpeg?auto=compress&cs=tinysrgb&w=1000",
    label: "Wooden table",
  },
  {
    src: "https://images.pexels.com/photos/10397037/pexels-photo-10397037.jpeg?auto=compress&cs=tinysrgb&w=1000",
    label: "Teak chest",
  },
  {
    src: "https://images.pexels.com/photos/34237532/pexels-photo-34237532.jpeg?auto=compress&cs=tinysrgb&w=1000",
    label: "Ceramic lamp",
  },
  {
    src: "https://images.pexels.com/photos/2168227/pexels-photo-2168227.jpeg?auto=compress&cs=tinysrgb&w=1000",
    label: "Restored chair",
  },
  {
    src: "https://images.pexels.com/photos/5825540/pexels-photo-5825540.jpeg?auto=compress&cs=tinysrgb&w=1000",
    label: "Console table",
  },
  {
    src: "https://images.pexels.com/photos/6825324/pexels-photo-6825324.jpeg?auto=compress&cs=tinysrgb&w=1000",
    label: "Upcycled lamp",
  },
  {
    src: "https://images.pexels.com/photos/4503943/pexels-photo-4503943.jpeg?auto=compress&cs=tinysrgb&w=1000",
    label: "Reclaimed shelf",
  },
  {
    src: "https://images.pexels.com/photos/3185223/pexels-photo-3185223.jpeg?auto=compress&cs=tinysrgb&w=1000",
    label: "Fabric bag",
  },
  {
    src: "https://images.pexels.com/photos/16428589/pexels-photo-16428589.jpeg?auto=compress&cs=tinysrgb&w=1000",
    label: "Reworked jacket",
  },
];

export const FAQ_TOPICS = [
  "Buying",
  "Selling",
  "Donating",
  "ReMakers",
  "Payments & refunds",
  "Account",
];
const POLICY_TOKENS = [
  {
    token: "{platform_fee}",
    label: "Platform fee",
    hint: "The fee in Settings, such as 3%",
  },
  {
    token: "{free_delivery_from}",
    label: "Free delivery from",
    hint: "Subtotal for free delivery on platform products",
  },
  {
    token: "{cod_limit}",
    label: "Cash on delivery limit",
    hint: "Largest order that can use cash on delivery",
  },
  {
    token: "{unsold_days}",
    label: "Unsold alert days",
    hint: "Days before an unsold item is flagged",
  },
];
export { POLICY_TOKENS };

/* ---------------------------------------------------------
   State
   --------------------------------------------------------- */
let state = {
  categories: [], // loaded from the backend (see loadCategories)
  catStatus: "idle", // idle | loading | ready | error
  banners: [],
  faqs: [],
  policies: [],
  log: [],
  status: "idle", // idle | loading | ready | error  (banners, FAQs, policies)
};

const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;
const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const useRaw = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

/* The Content page registers a toast here so a refused change is shown. */
let errorHandler = null;
export const onContentError = (fn) => {
  errorHandler = fn;
  return () => {
    if (errorHandler === fn) errorHandler = null;
  };
};
const failed = (e) =>
  errorHandler?.(
    e?.errors
      ? Object.values(e.errors).flat()[0]
      : e?.message || "That did not work. Please try again.",
  );

export async function loadContent(force = false) {
  if (!force && (state.status === "loading" || state.status === "ready"))
    return;
  set({ status: "loading" });
  try {
    const [banners, faqs, policies, log] = await Promise.all([
      adminContentApi.banners(),
      adminContentApi.faqs(),
      adminContentApi.policies(),
      adminContentApi.log(),
    ]);
    set({ banners, faqs, policies, log, status: "ready" });
  } catch (e) {
    set({ status: "error" });
  }
}
const reloadLog = () =>
  adminContentApi
    .log()
    .then((log) => set({ log }))
    .catch(() => {});

/* Runs a server call after an on-screen change. If the server refuses, reload
   the real data (undoing the on-screen change) and show why. */
function sync(promise, onDone) {
  return promise
    .then((r) => {
      onDone?.(r);
      reloadLog();
      return r;
    })
    .catch((e) => {
      failed(e);
      loadContent(true);
    });
}
const swapRow = (list, row) => list.map((x) => (x.id === row.id ? row : x));

function useContentLoader() {
  const raw = useRaw();
  useEffect(() => {
    loadContent();
  }, []);
  return raw;
}
export const useContentStatus = () => useRaw().status;
export const useContentLog = () => useContentLoader().log;


/* ---------------------------------------------------------
   Categories (real data: Admin > Content talks to /api/core/admin/categories/)
   --------------------------------------------------------- */
export async function loadCategories(force = false) {
  if (!force && (state.catStatus === "loading" || state.catStatus === "ready"))
    return;
  set({ catStatus: "loading" });
  try {
    set({ categories: await adminCategoryApi.list(), catStatus: "ready" });
  } catch (e) {
    set({ catStatus: "error" });
  }
}
const putCategory = (row) =>
  set({ categories: state.categories.map((c) => (c.id === row.id ? row : c)) });

export function useCategories() {
  const { categories } = useRaw();
  useEffect(() => {
    loadCategories();
  }, []);
  return useMemo(
    () => categories.map((c, i) => ({ ...c, position: i })),
    [categories],
  );
}
export const useCategoriesStatus = () => useRaw().catStatus;

export const categoryNameTaken = (name, exceptId) =>
  state.categories.some(
    (c) =>
      c.id !== exceptId &&
      c.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );

/* These return a promise and throw the server's message when something is refused. */
export async function createCategory(values) {
  await adminCategoryApi.create(values);
  await loadCategories(true); // the server keeps "Other" last, so take its order
  refreshCategories();
}
export async function updateCategory(id, values) {
  const body = { description: (values.blurb || "").trim(), icon: values.icon };
  const cur = state.categories.find((c) => c.id === id);
  if (values.name !== undefined && values.name.trim() !== cur?.name)
    body.name = values.name.trim();
  putCategory(await adminCategoryApi.update(id, body));
  refreshCategories();
}
export async function setCategoryActive(id, active) {
  putCategory(await adminCategoryApi.update(id, { active }));
  refreshCategories();
}
export async function moveCategory(id, dir) {
  const before = state.categories;
  const list = [...before];
  const i = list.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length || list[j].locked || list[i].locked)
    return;
  [list[i], list[j]] = [list[j], list[i]];
  set({ categories: list }); // show the move at once
  try {
    set({ categories: await adminCategoryApi.move(id, dir) });
    refreshCategories();
  } catch (e) {
    set({ categories: before });
    throw e;
  }
}
export async function removeCategory(id) {
  await adminCategoryApi.remove(id);
  set({ categories: state.categories.filter((c) => c.id !== id) });
  refreshCategories();
}


/* ---------------------------------------------------------
   Banners  (status, CTR and the "starts in" days come from the server)
   --------------------------------------------------------- */
export function useBanners() {
  return useContentLoader().banners;
}
const uid = () => `tmp-${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
const bannerBody = (v) => ({
  title: v.title,
  subtitle: v.subtitle || "",
  cta: v.cta || "",
  link: v.link,
  placement: v.placement,
  audience: v.audience,
  image: v.image,
  start: v.start || "",
  end: v.end || "",
});

/* Returns the id at once (a temporary one for a new banner, swapped for the real one). */
export function saveBanner(id, values) {
  if (id) {
    set({
      banners: state.banners.map((b) =>
        b.id === id ? { ...b, ...bannerBody(values) } : b,
      ),
    });
    sync(adminContentApi.updateBanner(id, bannerBody(values)), (row) =>
      set({ banners: swapRow(state.banners, row) }),
    );
    return id;
  }
  const tmp = uid();
  set({
    banners: [
      ...state.banners,
      {
        ...bannerBody(values),
        id: tmp,
        active: false,
        status: "Draft",
        views: 0,
        clicks: 0,
        ctr: 0,
        startsIn: 0,
        endsIn: null,
        createdAt: new Date().toISOString(),
      },
    ],
  });
  sync(adminContentApi.createBanner(bannerBody(values)), (row) =>
    set({ banners: state.banners.map((b) => (b.id === tmp ? row : b)) }),
  );
  return tmp;
}
export function setBannerActive(id, active) {
  set({
    banners: state.banners.map((b) =>
      b.id === id
        ? {
            ...b,
            active,
            status: active ? (b.status === "Draft" ? "Live" : b.status) : "Draft",
          }
        : b,
    ),
  });
  // the server works out Live / Scheduled / Ended from the dates
  sync(adminContentApi.updateBanner(id, { active }), (row) =>
    set({ banners: swapRow(state.banners, row) }),
  );
}
export function duplicateBanner(id) {
  sync(adminContentApi.duplicateBanner(id), (row) =>
    set({ banners: [...state.banners, row] }),
  );
}
export function removeBanner(id) {
  set({ banners: state.banners.filter((b) => b.id !== id) });
  sync(adminContentApi.removeBanner(id));
}
export function moveBanner(id, dir) {
  const list = [...state.banners];
  const i = list.findIndex((b) => b.id === id);
  if (i < 0) return;
  let j = i + dir;
  while (j >= 0 && j < list.length && list[j].placement !== list[i].placement)
    j += dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  set({ banners: list });
  sync(adminContentApi.moveBanner(id, dir), (rows) => set({ banners: rows }));
}

/* ---------------------------------------------------------
   FAQs
   --------------------------------------------------------- */
export const useFaqs = () => useContentLoader().faqs;

export function saveFaq(id, values) {
  const body = { topic: values.topic, q: values.q, a: values.a };
  if (id) {
    set({
      faqs: state.faqs.map((f) => (f.id === id ? { ...f, ...body } : f)),
    });
    sync(adminContentApi.updateFaq(id, body), (row) =>
      set({ faqs: swapRow(state.faqs, row) }),
    );
    return id;
  }
  const tmp = uid();
  set({
    faqs: [
      ...state.faqs,
      { ...body, id: tmp, published: true, helpful: 0, notHelpful: 0 },
    ],
  });
  sync(adminContentApi.createFaq({ ...body, published: true }), (row) =>
    set({ faqs: state.faqs.map((f) => (f.id === tmp ? row : f)) }),
  );
  return tmp;
}
export function setFaqPublished(id, published) {
  set({ faqs: state.faqs.map((f) => (f.id === id ? { ...f, published } : f)) });
  sync(adminContentApi.updateFaq(id, { published }), (row) =>
    set({ faqs: swapRow(state.faqs, row) }),
  );
}
export function removeFaq(id) {
  set({ faqs: state.faqs.filter((f) => f.id !== id) });
  sync(adminContentApi.removeFaq(id));
}
export function moveFaq(id, dir) {
  const list = [...state.faqs];
  const i = list.findIndex((f) => f.id === id);
  if (i < 0) return;
  let j = i + dir;
  while (j >= 0 && j < list.length && list[j].topic !== list[i].topic) j += dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  set({ faqs: list });
  sync(adminContentApi.moveFaq(id, dir), (rows) => set({ faqs: rows }));
}

/* ---------------------------------------------------------
   Policies  (drafts, versions and the live text are all stored by the server)
   --------------------------------------------------------- */
export const usePolicies = () => useContentLoader().policies;

const putPolicy = (row) =>
  set({ policies: state.policies.map((p) => (p.key === row.key ? row : p)) });

export function saveDraft(key, body, note, by) {
  putPolicy({
    ...state.policies.find((p) => p.key === key),
    draft: { body, note, at: new Date().toISOString(), by: by || "Admin" },
  });
  sync(adminContentApi.saveDraft(key, { body, note }), putPolicy);
}
export function discardDraft(key) {
  putPolicy({ ...state.policies.find((p) => p.key === key), draft: null });
  sync(adminContentApi.discardDraft(key), putPolicy);
}

/* The version number is worked out the same way on the server. */
const nextVersion = (p, major) => {
  if (p.neverPublished) return "1.0";
  const [a, b] = String(p.version).split(".").map(Number);
  return major ? `${a + 1}.0` : `${a}.${b + 1}`;
};
export function publishPolicy(key, body, note, major, by) {
  const p = state.policies.find((x) => x.key === key);
  const v = nextVersion(p, major);
  const at = new Date().toISOString();
  putPolicy({
    ...p,
    body,
    version: v,
    status: "Published",
    neverPublished: false,
    updatedAt: at,
    updatedBy: by || "Admin",
    draft: null,
    versions: [
      { v, at, by: by || "Admin", note: note || "First version", body },
      ...(p.versions || []),
    ],
  });
  sync(adminContentApi.publish(key, { body, note, major: !!major }), (r) =>
    putPolicy(r.policy),
  );
  return v;
}

/* Putting back an old version publishes it as a NEW version, so nothing is lost. */
export function restoreVersion(key, v, by) {
  const p = state.policies.find((x) => x.key === key);
  const old = p?.versions.find((x) => x.v === v);
  if (!old) return null;
  const nv = nextVersion(p, false);
  const at = new Date().toISOString();
  putPolicy({
    ...p,
    body: old.body,
    version: nv,
    updatedAt: at,
    updatedBy: by || "Admin",
    draft: null,
    versions: [
      { v: nv, at, by: by || "Admin", note: `Restored version ${v}`, body: old.body },
      ...p.versions,
    ],
  });
  sync(adminContentApi.restore(key, v), (r) => putPolicy(r.policy));
  return nv;
}

/* Fills {tokens} with the live values from Settings. */
export function fillTokens(text, commerce, warehouse) {
  const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
  return String(text || "")
    .replace(/\{platform_fee\}/g, `${commerce?.platformFeePct ?? 3}%`)
    .replace(/\{free_delivery_from\}/g, inr(commerce?.freeDeliveryFrom ?? 1500))
    .replace(/\{cod_limit\}/g, inr(commerce?.codLimit ?? 20000))
    .replace(/\{unsold_days\}/g, String(warehouse?.unsoldDays ?? 7));
}

/* The few lines of markup we allow: “## Heading”, “- bullet”, blank-line paragraphs. */
export function parseBody(text) {
  const blocks = [];
  String(text || "")
    .split(/\n{2,}/)
    .forEach((chunk) => {
      const lines = chunk.split("\n");
      let para = [];
      const flush = () => {
        if (para.length) {
          blocks.push({ type: "p", text: para.join(" ") });
          para = [];
        }
      };
      let list = null;
      lines.forEach((ln) => {
        if (/^##\s+/.test(ln)) {
          flush();
          list = null;
          blocks.push({ type: "h", text: ln.replace(/^##\s+/, "") });
        } else if (/^-\s+/.test(ln)) {
          flush();
          if (!list) {
            list = { type: "ul", items: [] };
            blocks.push(list);
          }
          list.items.push(ln.replace(/^-\s+/, ""));
        } else if (ln.trim()) {
          list = null;
          para.push(ln.trim());
        }
      });
      flush();
    });
  return blocks;
}
