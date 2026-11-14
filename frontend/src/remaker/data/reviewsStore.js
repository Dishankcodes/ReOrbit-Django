/* =========================================================
   REMAKER REVIEWS (received)
   Every review the ReMaker has received, from the server:
     GET  /api/reviews/received/            product reviews + seller reviews
     POST /api/reviews/received/<id>/reply/ (DELETE removes it)
     POST /api/reviews/<id>/report/         (DELETE withdraws a pending report)
   Nothing is stored in the browser. A change shows on screen at once and is
   put back, with the reason, if the server refuses it.
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";

import { receivedReviewsApi, reviewReportApi } from "../../api/reviews";
import { getAccount } from "../../api/session";

/* The list belongs to whoever is signed in; a different account starts clean. */
let owner = "";
const whoAmI = () => {
  const a = getAccount();
  return a ? String(a.public_id || a.id || "") : "";
};

const ASPECT_LABELS = {
  quality: "Quality",
  as_described: "As described",
  value: "Value",
  packaging: "Packaging",
  communication: "Communication",
  packing: "Packing",
  dispatch: "Dispatch",
  as_promised: "As promised",
};

/* Server review -> the shape the cards use. */
function fromApi(r) {
  const seller = r.kind === "seller";
  const aspects = Object.entries(r.aspects || {}).map(([key, value]) => ({
    label: ASPECT_LABELS[key] || key,
    value,
  }));
  const text = [r.title && !seller ? r.title : "", r.body]
    .filter(Boolean)
    .join(". ");

  return {
    id: r.id,
    kind: r.kind,
    orderId: r.order_id,
    productId: seller ? "service" : r.product?.ref || "",
    productTitle: seller ? "Your service" : r.product?.title || "Product",
    productImage: seller ? "" : r.product?.image || "",
    rating: r.rating,
    createdAt: r.created_at,
    reviewer: {
      name: r.reviewer?.name || "A customer",
      city: r.reviewer?.city || "",
      image: r.reviewer?.image || "",
      customerId: "",
    },
    text: text || "Rated without a written review.",
    aspects,
    tags: [...aspects.map((a) => `${a.label} ${a.value}★`), ...(r.tags || [])],
    photos: (r.photos || []).map((p) => p.url),
    recommend: r.recommend,
    verified: true,
    reply: r.reply
      ? {
          text: r.reply.text,
          createdAt: r.reply.created_at,
          edited: !!r.reply.edited,
        }
      : null,
    report: r.report
      ? {
          reason: r.report.reason,
          status: r.report.status,
          createdAt: r.report.created_at,
          note: r.report.resolution_note || "",
        }
      : null,
    hidden: r.status === "Hidden",
    hiddenReason: r.hidden_reason || "",
  };
}

let state = {
  list: [],
  status: "idle", // idle | loading | ready | error
  error: "",
  reasons: [],
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

export async function loadReviews(force = false) {
  const me = whoAmI();
  if (owner !== me) {
    owner = me;
    state = { list: [], status: "idle", error: "", reasons: [] };
    force = true;
  }
  if (!force && (state.status === "loading" || state.status === "ready"))
    return;
  set({ status: "loading", error: "" });
  try {
    const data = await receivedReviewsApi.list();
    set({
      list: data.results.map(fromApi),
      reasons: data.report_reasons || [],
      status: "ready",
    });
  } catch (e) {
    set({
      status: "error",
      error: e?.message || "We couldn't load your reviews.",
    });
  }
}

/* Errors from changes made on screen (reply, report ...) go to whoever registered here. */
let errorHandler = null;
export const onReviewError = (fn) => {
  errorHandler = fn;
  return () => {
    if (errorHandler === fn) errorHandler = null;
  };
};
export const reportReviewError = (e) =>
  errorHandler?.(e?.errors ? Object.values(e.errors).flat()[0] : e?.message || "That did not work. Please try again.");

export function useReviews() {
  const snap = useSyncExternalStore(subscribe, getSnapshot);
  useEffect(() => {
    loadReviews();
  }, []);
  return useMemo(
    () => [...snap.list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [snap.list],
  );
}

export function useReviewsStatus() {
  const snap = useSyncExternalStore(subscribe, getSnapshot);
  return { status: snap.status, error: snap.error };
}

export const useReportReasons = () =>
  useSyncExternalStore(subscribe, getSnapshot).reasons;

const replace = (review) =>
  set({ list: state.list.map((r) => (r.id === review.id ? review : r)) });
const patch = (id, change) =>
  set({ list: state.list.map((r) => (r.id === id ? { ...r, ...change } : r)) });

/* Each action resolves when the server has saved it and rejects with the server's message. */
export async function saveReply(id, text) {
  replace(fromApi(await receivedReviewsApi.reply(id, text.trim())));
}

export async function deleteReply(id) {
  replace(fromApi(await receivedReviewsApi.removeReply(id)));
}

export async function reportReview(id, reason, note = "") {
  const report = await reviewReportApi.report(id, reason, note);
  patch(id, {
    report: {
      reason: report.reason,
      status: report.status,
      createdAt: report.created_at,
      note: "",
    },
  });
}

export async function withdrawReport(id) {
  await reviewReportApi.withdraw(id);
  patch(id, { report: null });
}

/* ---------- summaries ---------- */

export function summarize(list) {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  let replied = 0;
  let counted = 0;
  const aspectMap = new Map();

  list.forEach((review) => {
    if (review.hidden) return; // a hidden review no longer counts
    counted += 1;
    distribution[review.rating] += 1;
    sum += review.rating;
    if (review.reply) replied += 1;

    review.aspects.forEach(({ label, value }) => {
      const entry = aspectMap.get(label) || { tag: label, count: 0, sum: 0 };
      entry.count += 1;
      entry.sum += value;
      aspectMap.set(label, entry);
    });
  });

  const tags = [...aspectMap.values()]
    .map((entry) => ({ ...entry, average: entry.sum / entry.count }))
    .sort((a, b) => b.count - a.count);

  return {
    count: counted,
    average: counted ? sum / counted : 0,
    distribution,
    replied,
    needsReply: counted - replied,
    responseRate: counted ? (replied / counted) * 100 : 0,
    praised: tags.filter((tag) => tag.average >= 4.3).slice(0, 4),
    attention: tags.filter((tag) => tag.average < 4.3).slice(0, 3),
  };
}

export function ratingsByProduct(list) {
  const map = new Map();

  list.forEach((review) => {
    if (review.hidden || review.kind === "seller") return;
    const entry = map.get(review.productId) || {
      productId: review.productId,
      title: review.productTitle,
      image: review.productImage,
      count: 0,
      sum: 0,
    };

    entry.count += 1;
    entry.sum += review.rating;
    map.set(review.productId, entry);
  });

  return [...map.values()]
    .map((entry) => ({ ...entry, average: entry.sum / entry.count }))
    .sort((a, b) => b.count - a.count);
}

export const REPLY_TEMPLATES = {
  high: [
    "Thank you so much for the kind words. It means a lot to a small studio like mine.",
    "I am so happy you love it. Thank you for choosing a piece with a past.",
  ],
  mid: [
    "Thank you for the honest feedback. I will use it to make the next batch better.",
    "Thanks for sharing this. If anything can be improved, message me and I will happily help.",
  ],
  low: [
    "I am sorry this was not what you expected. Please message me through your order so I can make it right.",
    "Thank you for telling me. I would like to fix this. Please get in touch so I can look into it.",
  ],
};

export function relativeAgo(iso) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? "month" : "months"} ago`;
}
