/* =========================================================
   Admin › Products data layer (UI only, in-memory).

   One list for everything on the marketplace:
   - Community items  -> uploaded by Users   (data/adminUsers.js)
   - ReMaker products -> made by ReMakers    (data/adminRemakers.js)

   The list is derived live from the Users and ReMakers stores,
   so verifying an item here also shows on that user's profile.
   Backend later: replace useProducts() with an API call.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { useUsers, reviewUserItem } from "./usersStore";
import { useRemakers, setProductStatus } from "./remakersStore";

/* ---------- admin actions taken this session ---------- */
let history = {}; // { [productId]: [{ id, label, reason, by, at }] }
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => history;
const emit = () => listeners.forEach((l) => l());

function addHistory(productId, entry) {
  history = { ...history, [productId]: [entry, ...(history[productId] || [])] };
  emit();
}

/* ---------- small helpers ---------- */
function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const addDays = (iso, days) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};
const NOW_MS = new Date("2026-10-19T09:00:00").getTime();
const capNow = (iso) =>
  new Date(iso).getTime() > NOW_MS ? new Date(NOW_MS).toISOString() : iso;

const DESCRIPTIONS = {
  Furniture:
    "Solid, well-built piece with the character that only comes from years of use. Structure is sound and the surface has been cleaned. Minor signs of age add to its charm.",
  "Home Decor":
    "A statement piece for the home, carefully cleaned and checked before listing. Works as shown and ready to display straight away.",
  Fashion:
    "Pre-loved fabric given a new life. Every piece is washed, repaired where needed and finished by hand.",
  Clothing:
    "A bundle of gently worn garments, washed and sorted. Good for resale, upcycling or everyday wear.",
  Kitchen:
    "Sturdy kitchenware with plenty of life left. Cleaned and sanitised, with no cracks or leaks.",
  Electronics:
    "Tested and working at the time of listing. Includes the basics shown in the photos.",
  Books: "A tidy bundle of books in readable condition with all pages intact.",
  Sports:
    "Well-kept sports gear that still performs. Light cosmetic wear only.",
};

const REPORT_POOL = [
  { reason: "Photos do not match the item", by: "Dev Joshi" },
  { reason: "Price looks unrealistic", by: "Kabir Verma" },
  { reason: "Suspected duplicate listing", by: "Nisha Rao" },
  { reason: "Misleading description", by: "Ishita Nair" },
];

function groupState(type, verification, rawStatus) {
  if (type === "item") {
    if (verification === "Pending") return "pending";
    if (verification === "Rejected") return "rejected";
    return ["Listed", "Reserved"].includes(rawStatus) ? "live" : "off";
  }
  return rawStatus === "Listed" ? "live" : "off";
}

function timelineFor(p, extra) {
  const events = [
    {
      id: "posted",
      label: "Posted",
      detail: `By ${p.owner.name}`,
      at: p.posted_at,
      tone: "neutral",
    },
  ];
  const reviewAt = capNow(addDays(p.posted_at, 1 + (hash(p.id) % 2)));

  if (p.type === "item") {
    if (p.verification === "Verified") {
      events.push({
        id: "verified",
        label: "Verified",
        detail: "Approved by Admin · Nikhil Rao",
        at: reviewAt,
        tone: "good",
      });
    } else if (p.verification === "Rejected") {
      events.push({
        id: "rejected",
        label: "Rejected",
        detail: p.rejection_message || "Rejected by admin",
        at: reviewAt,
        tone: "bad",
      });
    } else {
      events.push({
        id: "waiting",
        label: "Waiting for review",
        detail: "In the verification queue",
        at: p.posted_at,
        tone: "wait",
        pending: true,
      });
    }
    if (p.verification === "Verified") {
      events.push({
        id: "listed",
        label: "Listed",
        detail: "Visible on the marketplace",
        at: reviewAt,
        tone: "good",
      });
      const later = {
        Reserved: "Reserved by a buyer",
        Sold: "Sold",
        Donated: "Donated",
        Warehouse: "Received at the warehouse",
        Refurbishment: "Sent for refurbishment",
        Completed: "Refurbishment completed",
      }[p.rawStatus];
      if (later)
        events.push({
          id: "later",
          label: p.rawStatus.replace("_", " "),
          detail: later,
          at: capNow(addDays(p.posted_at, 4 + (hash(p.id) % 14))),
          tone: "info",
        });
    }
  } else {
    events.push({
      id: "listed",
      label: p.rawStatus === "Draft" ? "Saved as draft" : "Listed",
      detail:
        p.rawStatus === "Draft"
          ? "Not visible yet"
          : "Visible on the marketplace",
      at: capNow(addDays(p.posted_at, 1)),
      tone: p.rawStatus === "Draft" ? "wait" : "good",
    });
    if (p.rawStatus === "Sold_Out")
      events.push({
        id: "soldout",
        label: "Sold out",
        detail: "No stock left",
        at: capNow(addDays(p.posted_at, 9 + (hash(p.id) % 20))),
        tone: "info",
      });
  }

  extra
    .slice()
    .reverse()
    .forEach((h) =>
      events.push({
        id: h.id,
        label: h.label,
        detail: h.reason ? `${h.by} · “${h.reason}”` : h.by,
        at: h.at,
        tone: h.tone,
      }),
    );
  return events.sort((a, b) => new Date(b.at) - new Date(a.at));
}

function build(users, remakers, extraHistory) {
  const list = [];

  users.forEach((user) => {
    user.items.forEach((item) => {
      const id = item.item_id;
      const h = hash(id);
      const base = {
        id,
        type: "item",
        typeLabel: "Community item",
        title: item.title,
        category: item.category,
        image: item.image,
        description: `${DESCRIPTIONS[item.category] || DESCRIPTIONS.Furniture} Listed by the owner as ${item.condition.toLowerCase()} condition.`,
        price: item.estimated_price,
        quantity: item.quantity,
        condition: item.condition,
        pickup: item.pickup_preference,
        source_item: null,
        verification: item.verification_status,
        rawStatus: item.item_status,
        rejection_message: item.rejection_message,
        is_disabled: Boolean(item.is_disabled),
        disabled_reason: item.disabled_reason || "",
        suggested_price: item.suggested_price ?? null,
        suggested_price_message: item.suggested_price_message || "",
        posted_at: item.created_at,
        views: 40 + (h % 600),
        wishlisted: h % 31,
        owner: {
          id: user.user_id,
          role: "User",
          name: user.full_name,
          image: user.profile.profile_image,
          email: user.email,
          city: user.profile.city,
          status: user.status,
          since: user.created_at,
          path: `/admin-users/${user.user_id}`,
          handle: null,
        },
        orders: user.orders
          .filter((o) => o.role === "Seller" && o.title === item.title)
          .slice(0, 5),
        reviews: [],
        reports:
          h % 9 === 0
            ? [
                {
                  id: `RP-${(h % 900) + 100}`,
                  ...REPORT_POOL[h % REPORT_POOL.length],
                  status: "Pending",
                  at: addDays(item.created_at, 6),
                },
              ]
            : [],
      };
      list.push(base);
    });
  });

  remakers.forEach((rm) => {
    rm.products.forEach((prod) => {
      const id = prod.product_id;
      const h = hash(id);
      list.push({
        id,
        type: "product",
        typeLabel: "ReMaker product",
        title: prod.title,
        category: prod.category,
        image: prod.image,
        description: `${DESCRIPTIONS[prod.category] || DESCRIPTIONS.Furniture} Handcrafted by ${rm.username}.`,
        price: prod.price,
        quantity: prod.stock,
        condition: null,
        pickup: null,
        source_item: prod.source_item,
        verification: null,
        rawStatus: prod.status,
        rejection_message: "",
        posted_at: prod.created_at,
        views: 120 + (h % 1400),
        wishlisted: 2 + (h % 90),
        owner: {
          id: rm.remaker_id,
          role: "ReMaker",
          name: rm.full_name,
          image: rm.profile.profile_image,
          email: rm.email,
          city: rm.profile.city,
          status: rm.status,
          since: rm.created_at,
          path: `/admin-remakers/${rm.remaker_id}`,
          handle: rm.username,
        },
        orders: rm.orders
          .filter((o) => o.role === "Seller" && o.title === prod.title)
          .slice(0, 5),
        reviews: rm.reviews.filter((r) => r.product === prod.title).slice(0, 4),
        reports:
          h % 11 === 0
            ? [
                {
                  id: `RP-${(h % 900) + 100}`,
                  ...REPORT_POOL[(h >> 3) % REPORT_POOL.length],
                  status: "Reviewed",
                  at: addDays(prod.created_at, 8),
                },
              ]
            : [],
      });
    });
  });

  return list
    .map((p) => {
      const extra = extraHistory[p.id] || [];
      const withState = {
        ...p,
        state: groupState(p.type, p.verification, p.rawStatus),
        history: extra,
      };
      return { ...withState, timeline: timelineFor(withState, extra) };
    })
    .sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));
}

export function useProducts() {
  const users = useUsers();
  const remakers = useRemakers();
  const extra = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(() => build(users, remakers, extra), [users, remakers, extra]);
}

export function useProduct(id) {
  return useProducts().find((p) => p.id === id) || null;
}

/* Apply one action to one listing (writes to the source store). */
export function runProductAction(product, action, reason = "") {
  if (product.type === "item") {
    reviewUserItem(
      product.owner.id,
      product.id,
      action.key === "reject" ? "Rejected" : "Verified",
      reason,
    );
  } else {
    setProductStatus(
      product.owner.id,
      product.id,
      action.key === "deactivate" ? "Inactive" : "Listed",
    );
  }
  addHistory(product.id, {
    id: `${product.id}-${Date.now()}`,
    label: {
      verify: "Verified",
      reject: "Rejected",
      deactivate: "Deactivated",
      reactivate: "Reactivated",
    }[action.key],
    reason,
    by: "Admin · You",
    at: new Date().toISOString(),
    tone:
      action.tone === "positive"
        ? "good"
        : action.tone === "danger"
          ? "bad"
          : "wait",
  });
}
