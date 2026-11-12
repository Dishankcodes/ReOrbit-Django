/* =========================================================
   REMAKER PORTFOLIO - store backed by /api/portfolio/me/
   The pages only use the exports of this file. The list is loaded once and
   kept; add / edit / delete update it in place so going back to the list is
   instant. Photos are real uploads (a Before and an After per work).
   ========================================================= */

import { useEffect, useSyncExternalStore } from "react";

import { portfolioApi, mapWork } from "../../api/portfolio";

let state = { works: [], loaded: false, loading: false, error: "" };
const listeners = new Set();

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = () => state;
const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

/* a different account signing in on this tab must not see the previous works */
if (typeof window !== "undefined") {
  window.addEventListener("reorbit:session-ended", () => {
    state = { works: [], loaded: false, loading: false, error: "" };
    listeners.forEach((listener) => listener());
  });
}

let inFlight = null;

export function loadPortfolio({ force = false } = {}) {
  if (inFlight && !force) return inFlight;

  set({ loading: true, error: "" });
  inFlight = portfolioApi
    .mine()
    .then((rows) => set({ works: rows.map(mapWork), loaded: true, loading: false }))
    .catch((error) =>
      set({
        loading: false,
        error: error.message || "We couldn't load your portfolio.",
      }),
    )
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

function useLoaded() {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);

  useEffect(() => {
    if (!current.loaded && !current.loading && !current.error) loadPortfolio();
  }, [current.loaded, current.loading, current.error]);

  return current;
}

const newestFirst = (list) =>
  [...list].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

/* Newest first */
export function usePortfolio() {
  return newestFirst(useLoaded().works);
}

/* { loaded, error, retry } so pages can show a loading or error state */
export function usePortfolioStatus() {
  const { loaded, loading, error } = useLoaded();

  return {
    loaded,
    loading: loading || (!loaded && !error),
    error,
    retry: () => loadPortfolio({ force: true }),
  };
}

export function useWork(id) {
  const { works } = useLoaded();

  return works.find((work) => work.id === id) || null;
}

/* The work plus whether we are still waiting for it (so a refresh on
   /remaker-portfolio/PF-1001 doesn't flash "we couldn't find that work"). */
export function useWorkState(id) {
  const { works, loaded, error } = useLoaded();
  const work = works.find((item) => item.id === id) || null;

  return {
    work,
    loading: !work && !loaded && !error,
    error: !work && Boolean(error) && !loaded ? error : "",
    retry: () => loadPortfolio({ force: true }),
  };
}

function upsert(row) {
  const exists = state.works.some((work) => work.id === row.id);

  set({
    works: exists
      ? state.works.map((work) => (work.id === row.id ? row : work))
      : [...state.works, row],
  });

  return row;
}

/* The three calls below throw an Error with .errors (field -> messages) when
   the server says no, so the form can show the reason. */
export async function addWork(values) {
  const row = mapWork(await portfolioApi.add(values));

  upsert(row);
  return { id: row.id };
}

export async function updateWork(id, values) {
  upsert(mapWork(await portfolioApi.update(id, values)));
  return { id };
}

/* Resolves with the removed work so the UI can offer Undo */
export async function deleteWork(id) {
  const removed = mapWork(await portfolioApi.remove(id));

  set({ works: state.works.filter((work) => work.id !== id) });
  return removed;
}

export async function restoreWork(work) {
  if (!work) return null;

  return upsert(mapWork(await portfolioApi.restore(work.id)));
}

/* ---------- helpers ---------- */

export function formatWorkDate(iso) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* Photos for a portfolio work: JPG, PNG or WebP, up to 5 MB (the server's limit) */
export const PORTFOLIO_PHOTO_MB = 5;

/* Other screens (chat, orders, tickets) still use these two */
export const MAX_UPLOAD_MB = 8;

/* Resize to keep stored images small, returns a data URL */
export function fileToDataUrl(file, maxSide = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Choose an image file (JPG, PNG or WebP)."));
      return;
    }

    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      reject(new Error(`That photo is over ${MAX_UPLOAD_MB} MB.`));
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");

      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);

      canvas
        .getContext("2d")
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("We couldn't read that photo. Try another one."));
    };

    image.src = url;
  });
}
