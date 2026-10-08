/* =========================================================
   REMAKER PORTFOLIO - UI STORE (no backend yet)
   Shapes follow the ReMaker_Portfolio table:
   portfolio_id, title, description, before_image, after_image,
   uploaded_at. Plus category and linkedProductId (a portfolio
   entry can point at a ReMaker_Products row).

   Works are kept in localStorage so add / edit / delete survive a
   refresh. Swap the functions below for API calls later; the pages
   only use the exports of this file.
   ========================================================= */

import { useSyncExternalStore } from "react";

const KEY = "reorbit_remaker_portfolio_v1";
const IMG = "/images/portfolio/";

const SEED = [
  {
    id: "pf-1006",
    title: "Teak Door Console Table",
    category: "Furniture",
    description:
      "A 70-year-old teak wardrobe door that was headed for scrap. I stripped the old varnish, kept the carved panel, rebuilt the frame and set it on hand-bent iron legs. Finished with a plant-based wax so the grain stays warm.",
    before: IMG + "before-tara-console.jpg",
    after: IMG + "tara-console.jpg",
    linkedProductId: "rp-1001",
    createdAt: "2026-09-21T10:20:00.000Z",
  },
  {
    id: "pf-1005",
    title: "Reclaimed Wood Floor Lamp",
    category: "Lighting",
    description:
      "Offcuts from a dismantled bookshelf, planed and joined into a tripod stand. New braided cable, dimmer switch and a linen shade. The warm bulb shows every knot in the wood.",
    before: IMG + "before-arjun-lamp.jpg",
    after: IMG + "arjun-lamp.jpg",
    linkedProductId: "rp-1002",
    createdAt: "2026-09-14T08:05:00.000Z",
  },
  {
    id: "pf-1004",
    title: "Denim Patchwork Tote",
    category: "Bags & Totes",
    description:
      "Six worn denim jackets cut and pieced into one sturdy everyday tote. Cotton lined and stitched to carry a laptop and groceries. Every bag has its own pattern.",
    before: IMG + "before-priya-bag.jpg",
    after: IMG + "priya-bag.jpg",
    linkedProductId: "rp-1003",
    createdAt: "2026-09-02T15:40:00.000Z",
  },
  {
    id: "pf-1003",
    title: "Iron Grille Wall Shelf",
    category: "Storage & Organisers",
    description:
      "A rusted window grille, wire-brushed and sealed, paired with a reclaimed pine plank. The pattern throws soft shadows on the wall in the evening.",
    before: IMG + "before-arjun-metal.jpg",
    after: IMG + "arjun-metal.jpg",
    linkedProductId: "rp-1004",
    createdAt: "2026-08-24T12:00:00.000Z",
  },
  {
    id: "pf-1002",
    title: "Cane-Back Accent Chair",
    category: "Furniture",
    description:
      "A wobbly dining chair with a broken back. New cane weave, tightened joints and a sage green finish. Still in progress for listing.",
    before: IMG + "before-tara-chair.jpg",
    after: IMG + "tara-chair.jpg",
    linkedProductId: "",
    createdAt: "2026-08-11T09:30:00.000Z",
  },
  {
    id: "pf-1001",
    title: "Teak Cabinet Revival",
    category: "Furniture",
    description:
      "A teak cabinet rescued from a home clear-out. Original brass hinges kept, new shelves cut from the same wood, and a hand-rubbed oil finish.",
    before: IMG + "before-tara-teak-cabinet.jpg",
    after: IMG + "tara-teak-cabinet.jpg",
    linkedProductId: "",
    createdAt: "2026-07-30T16:10:00.000Z",
  },
];

/* ---------- store ---------- */

function load() {
  try {
    const raw = localStorage.getItem(KEY);

    if (raw) {
      const value = JSON.parse(raw);
      if (Array.isArray(value)) return value;
    }
  } catch {
    /* ignore and fall back to the seed */
  }

  return SEED.map((work) => ({ ...work }));
}

let works = load();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(works));
    return true;
  } catch {
    /* storage full or blocked: the change still lives for this session */
    return false;
  }
}

function commit(next) {
  works = next;
  const persisted = persist();
  listeners.forEach((listener) => listener());
  return persisted;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return works;
}

/* Newest first */
export function usePortfolio() {
  const list = useSyncExternalStore(subscribe, getSnapshot);

  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function useWork(id) {
  const list = useSyncExternalStore(subscribe, getSnapshot);

  return list.find((work) => work.id === id) || null;
}

export function addWork(data) {
  const id = `pf-${Date.now().toString(36)}`;
  const work = { ...data, id, createdAt: new Date().toISOString() };
  const persisted = commit([...works, work]);

  return { id, persisted };
}

export function updateWork(id, patch) {
  const persisted = commit(
    works.map((work) => (work.id === id ? { ...work, ...patch } : work)),
  );

  return { persisted };
}

/* Returns the removed work so the UI can offer Undo */
export function deleteWork(id) {
  const removed = works.find((work) => work.id === id) || null;

  if (removed) commit(works.filter((work) => work.id !== id));

  return removed;
}

export function restoreWork(work) {
  if (!work || works.some((item) => item.id === work.id)) return;

  commit([...works, work]);
}

export function resetPortfolio() {
  commit(SEED.map((work) => ({ ...work })));
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

      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
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
