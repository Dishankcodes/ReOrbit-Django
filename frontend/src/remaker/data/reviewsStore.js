/* =========================================================
   REMAKER REVIEWS - UI STORE (no backend yet)
   Customer reviews of the ReMaker's products. Follows the Reviews
   table (product_id, rating, review text, created_at). The extras
   (reply, photos, tags, report) are what this page needs on top.

   Replies and reports are saved in localStorage so they survive a
   refresh. Replace the functions below with API calls later.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";

import { REMAKER_PRODUCTS } from "./remakerProducts";

const KEY = "reorbit_remaker_reviews_v1";
const NOW = Date.now();
const ago = (hours) => new Date(NOW - hours * 3600000).toISOString();

const IMG_USERS = "/images/users/";
const PORT = "/images/portfolio/";

export const REVIEW_TAGS = [
  "Quality",
  "Finish",
  "Design",
  "Packaging",
  "Delivery",
  "Value",
  "Communication",
];

/* [productId, rating, hoursAgo, reviewer, text, tags, photos, helpful, reply?] */
const RAW = [
  [
    "rp-1002",
    5,
    30,
    {
      name: "Meera Iyer",
      city: "Bengaluru",
      image: IMG_USERS + "meera-iyer.jpg",
      customerId: "c-meera",
    },
    "The light is gorgeous. You can see every knot in the wood and the linen shade makes the glow so warm. It looks like something from a design store.",
    ["Design", "Quality"],
    [PORT + "arjun-lamp.jpg"],
    6,
    null,
  ],
  [
    "rp-1003",
    5,
    62,
    {
      name: "Aarav Patel",
      city: "Ahmedabad",
      image: IMG_USERS + "aarav-patel.jpg",
      customerId: "c-aarav",
    },
    "Three of these for my team and everyone loves them. The stitching is strong and no two patches are the same. Arrived well wrapped.",
    ["Quality", "Packaging"],
    [PORT + "priya-bag.jpg"],
    9,
    {
      text: "Thank you Aarav! I am so glad the team enjoys them. I will share when the next denim batch is ready.",
      hours: 40,
    },
  ],
  [
    "rp-1001",
    4,
    96,
    {
      name: "Nisha Rao",
      city: "Mumbai",
      image: IMG_USERS + "nisha-rao.jpg",
      customerId: "c-nisha",
    },
    "Beautiful console and the carved panel is a real talking point. It is heavier than I expected so plan for two people. One small scuff on the leg but nothing serious.",
    ["Design", "Finish"],
    [],
    4,
    {
      text: "Thanks Nisha. Sorry about the scuff, a dab of wax pencil will hide it. Message me if you want the exact shade.",
      hours: 70,
    },
  ],
  [
    "rp-1001",
    5,
    140,
    {
      name: "Rohan Shah",
      city: "Pune",
      image: IMG_USERS + "rohan-shah.jpg",
      customerId: "c-rohan",
    },
    "Worth every rupee. The teak grain is stunning and the iron legs are rock solid. It has become the first thing guests notice in our hall.",
    ["Quality", "Value"],
    [PORT + "tara-console.jpg"],
    12,
    null,
  ],
  [
    "rp-1004",
    5,
    190,
    {
      name: "Tara Bose",
      city: "Kolkata",
      image: "/images/remakers/tara-bose.jpg",
      customerId: "c-tara",
    },
    "As a fellow ReMaker I notice the details. The wire brushing and sealing on the grille is very clean, and the pine plank was a smart pairing.",
    ["Finish", "Design"],
    [PORT + "arjun-metal.jpg"],
    15,
    { text: "That means a lot coming from you, Tara. Thank you!", hours: 170 },
  ],
  [
    "rp-1002",
    3,
    215,
    {
      name: "Kabir Verma",
      city: "Delhi",
      image: IMG_USERS + "kabir-verma.jpg",
      customerId: "c-kabir",
    },
    "Lovely lamp, but the cloth cable is shorter than I hoped and I need an extender to reach my socket. Looks great otherwise.",
    ["Design", "Value"],
    [],
    3,
    null,
  ],
  [
    "rp-1003",
    5,
    260,
    {
      name: "Anaya Singh",
      city: "Jaipur",
      image: IMG_USERS + "anaya-singh.jpg",
      customerId: "c-anaya",
    },
    "Picked it up in person. The tote is roomy enough for my laptop and still looks stylish. Lovely to meet the maker too.",
    ["Quality", "Communication"],
    [],
    5,
    {
      text: "It was a pleasure meeting you Anaya. Enjoy the tote!",
      hours: 250,
    },
  ],
  [
    "rp-1003",
    2,
    330,
    { name: "Dev Malhotra", city: "Surat", image: "", customerId: "c-dev" },
    "The strap seam started to come apart after about a week. Pretty design but I expected better stitching for the price.",
    ["Quality"],
    [],
    7,
    null,
  ],
  [
    "rp-1002",
    4,
    400,
    { name: "Isha Kapoor", city: "Bengaluru", image: "", customerId: "c-isha" },
    "Gorgeous piece. Took a day longer than promised to ship but the packaging was excellent and nothing was damaged.",
    ["Packaging", "Delivery"],
    [],
    2,
    {
      text: "Thanks Isha, and sorry for the delay. I now ship on the same day I mark an order packed.",
      hours: 380,
    },
  ],
  [
    "rp-1004",
    4,
    480,
    { name: "Vikram Joshi", city: "Pune", image: "", customerId: "" },
    "A really striking wall shelf. The shadows in the evening are lovely. The mounting hardware instructions could be clearer.",
    ["Design", "Communication"],
    [],
    3,
    null,
  ],
  [
    "rp-1001",
    5,
    560,
    { name: "Pranav Desai", city: "Ahmedabad", image: "", customerId: "" },
    "Picked this over three store options and I am so happy I did. You can feel the history in the wood.",
    ["Quality", "Design"],
    [PORT + "tara-teak-cabinet.jpg"],
    8,
    { text: "Thank you Pranav, that is the best thing to hear.", hours: 540 },
  ],
  [
    "rp-1003",
    5,
    620,
    { name: "Mansi Gupta", city: "Mumbai", image: "", customerId: "" },
    "Bought two as gifts and both people asked where to get one. The patchwork is so charming.",
    ["Design", "Value"],
    [PORT + "priya-jacket.jpg"],
    6,
    null,
  ],
  [
    "rp-1002",
    1,
    700,
    { name: "Harsh Vora", city: "Rajkot", image: "", customerId: "" },
    "Complete scam seller, never buy from here. Terrible. Do not trust anyone on this site.",
    [],
    [],
    0,
    null,
  ],
  [
    "rp-1001",
    4,
    810,
    { name: "Leena Nair", city: "Kochi", image: "", customerId: "" },
    "Excellent finish and the wax smell is faint and pleasant. I would have loved a size guide in the listing.",
    ["Finish", "Communication"],
    [],
    2,
    {
      text: "Great point Leena. I have added the exact dimensions to the product page.",
      hours: 790,
    },
  ],
  [
    "rp-1004",
    5,
    900,
    { name: "Ishaan Rao", city: "Hyderabad", image: "", customerId: "" },
    "Sturdy and so unusual. My friends keep asking where it came from. The story card in the box was a lovely touch.",
    ["Design", "Packaging"],
    [PORT + "arjun-shelf.jpg"],
    10,
    null,
  ],
  [
    "rp-1002",
    5,
    1010,
    { name: "Gauri Kulkarni", city: "Nashik", image: "", customerId: "" },
    "Bright, warm and the dimmer works perfectly. Excellent value for something this handmade.",
    ["Value", "Quality"],
    [],
    4,
    { text: "Thank you Gauri! Enjoy the glow.", hours: 990 },
  ],
];

function seed() {
  return RAW.map((row, index) => {
    const [
      productId,
      rating,
      hours,
      reviewer,
      text,
      tags,
      photos,
      helpful,
      reply,
    ] = row;
    const product = REMAKER_PRODUCTS.find((item) => item.id === productId);

    return {
      id: `rv-${1000 + index}`,
      productId,
      productTitle: product.title,
      productImage: product.images[0],
      rating,
      createdAt: ago(hours),
      reviewer,
      text,
      tags,
      photos,
      helpful,
      verified: true,
      reply: reply ? { text: reply.text, createdAt: ago(reply.hours) } : null,
      report: null,
    };
  });
}

/* ---------- store ---------- */

function load() {
  try {
    const raw = localStorage.getItem(KEY);

    if (raw) {
      const value = JSON.parse(raw);
      if (Array.isArray(value)) return value;
    }
  } catch {
    /* fall back to the seed */
  }

  return seed();
}

let reviews = load();
const listeners = new Set();

function commit(next) {
  reviews = next;

  try {
    localStorage.setItem(KEY, JSON.stringify(reviews));
  } catch {
    /* storage full or blocked: the change still lives for this session */
  }

  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => reviews;

export function useReviews() {
  const list = useSyncExternalStore(subscribe, getSnapshot);

  return useMemo(
    () => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [list],
  );
}

function patch(id, change) {
  commit(
    reviews.map((review) =>
      review.id === id ? { ...review, ...change } : review,
    ),
  );
}

export function saveReply(id, text) {
  const existing = reviews.find((review) => review.id === id);

  patch(id, {
    reply: {
      text: text.trim(),
      createdAt: existing?.reply?.createdAt || new Date().toISOString(),
      edited: Boolean(existing?.reply),
    },
  });
}

export function deleteReply(id) {
  patch(id, { reply: null });
}

export function reportReview(id, reason) {
  patch(id, {
    report: { reason, createdAt: new Date().toISOString(), status: "Pending" },
  });
}

export function withdrawReport(id) {
  patch(id, { report: null });
}

export function resetReviews() {
  commit(seed());
}

/* ---------- summaries ---------- */

export function summarize(list) {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  let replied = 0;
  const tagMap = new Map();

  list.forEach((review) => {
    distribution[review.rating] += 1;
    sum += review.rating;
    if (review.reply) replied += 1;

    review.tags.forEach((tag) => {
      const entry = tagMap.get(tag) || { tag, count: 0, sum: 0 };
      entry.count += 1;
      entry.sum += review.rating;
      tagMap.set(tag, entry);
    });
  });

  const tags = [...tagMap.values()]
    .map((entry) => ({ ...entry, average: entry.sum / entry.count }))
    .sort((a, b) => b.count - a.count);

  return {
    count: list.length,
    average: list.length ? sum / list.length : 0,
    distribution,
    replied,
    needsReply: list.length - replied,
    responseRate: list.length ? (replied / list.length) * 100 : 0,
    praised: tags.filter((tag) => tag.average >= 4.3).slice(0, 4),
    attention: tags.filter((tag) => tag.average < 4.3).slice(0, 3),
  };
}

export function ratingsByProduct(list) {
  const map = new Map();

  list.forEach((review) => {
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

export const REPORT_REASONS = [
  "Abusive or hateful language",
  "Not about my product or service",
  "Contains personal information",
  "Looks fake or paid for",
  "Spam or advertising",
];

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
