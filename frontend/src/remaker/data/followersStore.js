/* =========================================================
   REMAKER FOLLOWERS - UI STORE (no backend yet)
   People (and other ReMakers) who follow this ReMaker, plus the
   ReMakers this ReMaker follows. Follows the "user can follow
   ReMaker" feature from the schema notes.

   The list is generated with a fixed seed so it looks the same on
   every refresh. Changes (remove follower, follow back, unfollow)
   are saved in localStorage. Swap for API calls later.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";

import { getRemakerById } from "../../data/marketplaceData";

const KEY = "reorbit_remaker_followers_v1";
const NOW = Date.now();
const ago = (hours) => new Date(NOW - hours * 3600000).toISOString();

function mulberry(seed) {
  let a = seed;

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- people with real photos (also customers) ---------- */

const KNOWN = [
  { id: "c-meera", name: "Meera Iyer", type: "User", city: "Bengaluru", state: "Karnataka", image: "/images/users/meera-iyer.jpg", customerId: "c-meera", bio: "Loves warm lighting and old wood. Collecting pieces with a story.", hours: 2300 },
  { id: "c-rohan", name: "Rohan Shah", type: "User", city: "Pune", state: "Maharashtra", image: "/images/users/rohan-shah.jpg", customerId: "c-rohan", bio: "Restoring a 1960s flat one piece at a time.", hours: 1800 },
  { id: "c-anaya", name: "Anaya Singh", type: "User", city: "Jaipur", state: "Rajasthan", image: "/images/users/anaya-singh.jpg", customerId: "c-anaya", bio: "Designer who prefers handmade over mass made.", hours: 520 },
  { id: "c-kabir", name: "Kabir Verma", type: "User", city: "Delhi", state: "Delhi", image: "/images/users/kabir-verma.jpg", customerId: "c-kabir", bio: "Collector of lamps and anything made from metal scrap.", hours: 260 },
  { id: "c-aarav", name: "Aarav Patel", type: "User", city: "Ahmedabad", state: "Gujarat", image: "/images/users/aarav-patel.jpg", customerId: "c-aarav", bio: "Buys gifts for his team from local makers.", hours: 90 },
  { id: "c-nisha", name: "Nisha Rao", type: "User", city: "Mumbai", state: "Maharashtra", image: "/images/users/nisha-rao.jpg", customerId: "c-nisha", bio: "Interior stylist hunting for statement furniture.", hours: 3100 },
  { id: "tara-bose", name: "Tara Bose", type: "ReMaker", city: "Kolkata", state: "West Bengal", image: "/images/remakers/tara-bose.jpg", customerId: "c-tara", bio: "Furniture and wood restoration. Follows makers she admires.", hours: 4200, craft: "Furniture & Wood Restoration" },
  { id: "arjun-mehta", name: "Arjun Mehta", type: "ReMaker", city: "Ahmedabad", state: "Gujarat", image: "/images/remakers/arjun-mehta.jpg", customerId: "", bio: "Metal and reclaimed wood lighting from old machine parts.", hours: 3600, craft: "Lighting & Metal Upcycling" },
  { id: "priya-shah", name: "Priya Shah", type: "ReMaker", city: "Mumbai", state: "Maharashtra", image: "/images/remakers/priya-shah.jpg", customerId: "", bio: "Textile upcycling: bags, jackets and home decor.", hours: 2900, craft: "Textile Upcycling" },
];

const FIRST = ["Aditi", "Sameer", "Kavya", "Dhruv", "Riya", "Nikhil", "Ishaan", "Leena", "Pooja", "Harsh", "Devika", "Vikram", "Sana", "Amit", "Tanvi", "Manav", "Gauri", "Yash", "Pranav", "Ishita", "Mansi", "Rahul", "Neha", "Karan", "Divya", "Rohit", "Simran", "Varun", "Ananya", "Siddharth", "Meghna", "Tushar"];
const LAST = ["Desai", "Nair", "Kulkarni", "Joshi", "Gupta", "Reddy", "Menon", "Bhatt", "Kapoor", "Malhotra", "Chopra", "Sinha", "Pillai", "Mehra", "Shetty", "Bansal", "Trivedi", "Rao", "Jain", "Saxena"];
const PLACES = [
  ["Ahmedabad", "Gujarat"], ["Mumbai", "Maharashtra"], ["Bengaluru", "Karnataka"], ["Pune", "Maharashtra"], ["Delhi", "Delhi"],
  ["Jaipur", "Rajasthan"], ["Kolkata", "West Bengal"], ["Surat", "Gujarat"], ["Hyderabad", "Telangana"], ["Chennai", "Tamil Nadu"],
  ["Kochi", "Kerala"], ["Vadodara", "Gujarat"], ["Indore", "Madhya Pradesh"], ["Lucknow", "Uttar Pradesh"],
];
const USER_BIOS = [
  "Upcycling fan. Always looking for something with a past.",
  "Decorating a first home with handmade pieces.",
  "Follows makers for ideas and gift shopping.",
  "Loves reclaimed wood and honest craftsmanship.",
  "Collects vintage finds and gives them a second life.",
  "Sustainable living, one purchase at a time.",
];
const MAKER_CRAFTS = ["Ceramics & Pottery", "Furniture Restoration", "Metal Art", "Textile & Patchwork", "Glass & Mosaic"];

function generate() {
  const random = mulberry(98765);
  const list = KNOWN.map((person) => ({
    ...person,
    followedAt: ago(person.hours),
    joined: "2025",
    views: 8 + Math.floor(random() * 40),
    saves: Math.floor(random() * 7),
    mutual: person.type === "ReMaker",
  }));

  while (list.length < 96) {
    const first = FIRST[Math.floor(random() * FIRST.length)];
    const last = LAST[Math.floor(random() * LAST.length)];
    const name = `${first} ${last}`;

    if (list.some((person) => person.name === name)) continue;

    const place = PLACES[Math.floor(random() * PLACES.length)];
    const isMaker = random() < 0.1;
    const hours = Math.max(2, Math.round(Math.pow(random(), 1.6) * 24 * 330));

    list.push({
      id: `f-${list.length + 1}`,
      name,
      type: isMaker ? "ReMaker" : "User",
      city: place[0],
      state: place[1],
      image: "",
      customerId: "",
      bio: isMaker
        ? `ReMaker working in ${MAKER_CRAFTS[Math.floor(random() * MAKER_CRAFTS.length)].toLowerCase()}.`
        : USER_BIOS[Math.floor(random() * USER_BIOS.length)],
      craft: isMaker ? MAKER_CRAFTS[Math.floor(random() * MAKER_CRAFTS.length)] : "",
      followedAt: ago(hours),
      joined: String(2024 + Math.floor(random() * 2)),
      views: Math.floor(random() * 38),
      saves: Math.floor(random() * 6),
      mutual: false,
    });
  }

  return list;
}

function seedFollowing() {
  const real = ["arjun-mehta", "priya-shah", "tara-bose"]
    .map((id, index) => {
      const maker = getRemakerById(id);
      if (!maker) return null;

      return {
        id: maker.id,
        name: maker.name,
        craft: maker.craft,
        city: maker.city,
        image: maker.image,
        rating: maker.rating,
        followers: maker.followers,
        products: maker.productsCount,
        followedAt: ago(1500 + index * 700),
        profile: true,
      };
    })
    .filter(Boolean);

  const others = [
    { id: "m-ishita", name: "Ishita Rao", craft: "Ceramics & Pottery", city: "Jaipur", image: "", rating: 4.8, followers: 860, products: 24, followedAt: ago(3300), profile: false },
    { id: "m-vikram", name: "Vikram Joshi", craft: "Metal Art", city: "Pune", image: "", rating: 4.7, followers: 540, products: 15, followedAt: ago(2100), profile: false },
  ];

  return [...real, ...others];
}

function seed() {
  return { followers: generate(), following: seedFollowing() };
}

/* ---------- store ---------- */

function load() {
  try {
    const raw = localStorage.getItem(KEY);

    if (raw) {
      const value = JSON.parse(raw);
      if (value && Array.isArray(value.followers) && Array.isArray(value.following)) return value;
    }
  } catch {
    /* fall back to the seed */
  }

  return seed();
}

let state = load();
const listeners = new Set();

function commit(next) {
  state = next;

  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: the change still lives for this session */
  }

  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

export function useFollowers() {
  const current = useSyncExternalStore(subscribe, getSnapshot);

  return useMemo(
    () => [...current.followers].sort((a, b) => b.followedAt.localeCompare(a.followedAt)),
    [current.followers],
  );
}

export function useFollowing() {
  const current = useSyncExternalStore(subscribe, getSnapshot);

  return useMemo(
    () => [...current.following].sort((a, b) => b.followedAt.localeCompare(a.followedAt)),
    [current.following],
  );
}

/* ---------- actions ---------- */

export function removeFollower(id) {
  const removed = state.followers.find((person) => person.id === id) || null;

  if (removed) commit({ ...state, followers: state.followers.filter((person) => person.id !== id) });

  return removed;
}

export function restoreFollower(person) {
  if (!person || state.followers.some((item) => item.id === person.id)) return;

  commit({ ...state, followers: [...state.followers, person] });
}

export function followBack(person) {
  if (state.following.some((item) => item.id === person.id)) return;

  commit({
    ...state,
    following: [
      ...state.following,
      {
        id: person.id,
        name: person.name,
        craft: person.craft || "ReMaker",
        city: person.city,
        image: person.image,
        rating: 0,
        followers: 0,
        products: 0,
        followedAt: new Date().toISOString(),
        profile: Boolean(getRemakerById(person.id)),
      },
    ],
  });
}

export function unfollow(id) {
  const removed = state.following.find((item) => item.id === id) || null;

  if (removed) commit({ ...state, following: state.following.filter((item) => item.id !== id) });

  return removed;
}

export function restoreFollowing(item) {
  if (!item || state.following.some((entry) => entry.id === item.id)) return;

  commit({ ...state, following: [...state.following, item] });
}

export function resetFollowers() {
  commit(seed());
}

/* ---------- summaries ---------- */

export function followerStats(followers) {
  const monthAgo = NOW - 30 * 86400000;
  const twoMonthsAgo = NOW - 60 * 86400000;

  const last30 = followers.filter((person) => new Date(person.followedAt).getTime() >= monthAgo).length;
  const previous30 = followers.filter((person) => {
    const time = new Date(person.followedAt).getTime();
    return time >= twoMonthsAgo && time < monthAgo;
  }).length;

  const places = new Map();
  followers.forEach((person) => places.set(person.city, (places.get(person.city) || 0) + 1));

  return {
    total: followers.length,
    last30,
    previous30,
    makers: followers.filter((person) => person.type === "ReMaker").length,
    customers: followers.filter((person) => person.customerId).length,
    engaged: followers.filter((person) => person.views >= 34 || person.saves >= 5).length,
    places: [...places.entries()]
      .map(([city, count]) => ({ city, count, percent: (count / followers.length) * 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}

/* total followers at the end of each of the last `weeks` weeks */
export function growthSeries(followers, weeks = 12) {
  const points = [];

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const end = NOW - i * 7 * 86400000;
    const total = followers.filter((person) => new Date(person.followedAt).getTime() <= end).length;
    const date = new Date(end);

    points.push({
      label: `${date.getDate()} ${date.toLocaleString("en-IN", { month: "short" })}`,
      total,
    });
  }

  return points;
}

export function followedLabel(iso) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;

  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}
