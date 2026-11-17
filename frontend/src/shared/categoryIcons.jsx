/* =========================================================
   Shared › Category icons.
   ONE library for the whole site. Admin › Content › Categories lets the admin pick
   from it, the server only accepts these keys (apps/core/category_admin.py ICONS),
   and every member-facing page draws the saved key with <CategoryIcon>.
   Add an icon here AND to ICONS in category_admin.py.
   ========================================================= */

import React from "react";
import {
  Armchair, Sofa, BedDouble, Lamp, LampDesk, Bath, CookingPot, UtensilsCrossed,
  Refrigerator, Home, DoorOpen, Frame, Shirt, Watch, Gem, Glasses, Footprints,
  Backpack, ShoppingBag, Scissors, Smartphone, Laptop, Headphones, Camera, Tv,
  Gamepad2, Speaker, Plug, Palette, Brush, Flower2, Sparkles, Hammer, Wrench,
  Ruler, Baby, Blocks, Puzzle, BookOpen, Library, PenTool, NotebookPen, Newspaper,
  GraduationCap, Dumbbell, Bike, Tent, Trophy, Music, Guitar, Sprout, TreePine,
  Leaf, PawPrint, Recycle, Package, Gift, HeartHandshake, Tag, Boxes, Car,
} from "lucide-react";

/* key = the lucide name stored on the category. `words` help the admin search and drive "suggested for this name". */
const LIB = [
  ["Home & furniture", [
    ["Armchair", Armchair, "Armchair / chairs", "chair seat furniture seating"],
    ["Sofa", Sofa, "Sofa", "couch settee living room"],
    ["BedDouble", BedDouble, "Bed", "bed bedroom mattress cot"],
    ["Lamp", Lamp, "Floor lamp", "lamp light lighting lantern"],
    ["LampDesk", LampDesk, "Desk lamp", "desk study table lamp"],
    ["Frame", Frame, "Frame / wall art", "frame wall art picture mirror decor"],
    ["Home", Home, "Home & decor", "home decor house living interior"],
    ["DoorOpen", DoorOpen, "Doors & windows", "door window cabinet wardrobe"],
    ["CookingPot", CookingPot, "Cookware", "kitchen cook pot pan cookware utensils"],
    ["UtensilsCrossed", UtensilsCrossed, "Dining", "kitchen dining cutlery plates tableware"],
    ["Refrigerator", Refrigerator, "Appliances", "appliance fridge cooler home appliances"],
    ["Bath", Bath, "Bath & bathroom", "bath bathroom towel"],
  ]],
  ["Fashion & accessories", [
    ["Shirt", Shirt, "Clothing", "clothing clothes shirt wear apparel dress textile"],
    ["Footprints", Footprints, "Footwear", "shoes footwear sandals slippers"],
    ["Watch", Watch, "Watches", "watch accessory accessories"],
    ["Gem", Gem, "Jewellery", "jewellery jewelry gem ring necklace beads"],
    ["Glasses", Glasses, "Eyewear", "glasses eyewear sunglasses"],
    ["Backpack", Backpack, "Bags", "bag bags backpack luggage"],
    ["ShoppingBag", ShoppingBag, "Tote & shopping bags", "tote shopping bag jhola"],
    ["Scissors", Scissors, "Tailoring & fabric", "fabric tailoring stitch sewing patchwork"],
  ]],
  ["Electronics", [
    ["Smartphone", Smartphone, "Phones", "phone mobile smartphone tablet"],
    ["Laptop", Laptop, "Computers", "laptop computer pc electronics"],
    ["Headphones", Headphones, "Audio", "headphones audio earphones"],
    ["Speaker", Speaker, "Speakers", "speaker sound music system"],
    ["Camera", Camera, "Cameras", "camera photo photography"],
    ["Tv", Tv, "TV & displays", "tv television monitor screen"],
    ["Gamepad2", Gamepad2, "Games & consoles", "game games gaming console"],
    ["Plug", Plug, "Cables & gadgets", "cable charger gadget plug electrical"],
  ]],
  ["Art, craft & making", [
    ["Palette", Palette, "Art & paint", "art paint painting craft colours"],
    ["Brush", Brush, "Brushes & decor craft", "brush craft handmade"],
    ["Sparkles", Sparkles, "Upcycled & handmade", "upcycled handmade creation remaker special new"],
    ["Flower2", Flower2, "Flowers & decor", "flower floral decor vase"],
    ["Hammer", Hammer, "Wood & tools", "wood tools hammer carpentry"],
    ["Wrench", Wrench, "Hardware", "hardware tool wrench repair"],
    ["Ruler", Ruler, "Craft supplies", "supplies measure craft kit"],
    ["Recycle", Recycle, "Recycled materials", "recycle recycled reuse eco material scrap"],
  ]],
  ["Kids & toys", [
    ["Baby", Baby, "Baby & kids", "baby kids children infant"],
    ["Blocks", Blocks, "Toys", "toys toy blocks play"],
    ["Puzzle", Puzzle, "Puzzles & games", "puzzle board games"],
  ]],
  ["Books & stationery", [
    ["BookOpen", BookOpen, "Books", "books book reading novel"],
    ["Library", Library, "Collections", "library collection shelf magazines"],
    ["NotebookPen", NotebookPen, "Notebooks", "notebook stationery diary"],
    ["PenTool", PenTool, "Pens & drawing", "pen drawing stationery"],
    ["GraduationCap", GraduationCap, "Study & school", "study school college education"],
    ["Newspaper", Newspaper, "Paper & prints", "paper newspaper print"],
  ]],
  ["Sports, music & outdoors", [
    ["Dumbbell", Dumbbell, "Fitness", "fitness gym sports exercise"],
    ["Bike", Bike, "Bicycles", "bicycle bike cycling"],
    ["Trophy", Trophy, "Sports gear", "sports trophy cricket football"],
    ["Tent", Tent, "Outdoors", "camping outdoor trekking"],
    ["Music", Music, "Music", "music instruments"],
    ["Guitar", Guitar, "Instruments", "guitar instrument musical"],
    ["Car", Car, "Vehicles & parts", "car vehicle auto parts"],
  ]],
  ["Garden & pets", [
    ["Sprout", Sprout, "Plants & planters", "plant plants planter garden pot"],
    ["TreePine", TreePine, "Garden", "garden tree outdoor lawn"],
    ["Leaf", Leaf, "Eco & natural", "eco natural organic leaf green"],
    ["PawPrint", PawPrint, "Pet supplies", "pet pets dog cat"],
  ]],
  ["General", [
    ["Package", Package, "Everything else", "other misc general package"],
    ["Boxes", Boxes, "Storage & organisers", "storage organiser box boxes containers"],
    ["Gift", Gift, "Gifts", "gift hamper present festive"],
    ["Tag", Tag, "Sale / tag", "tag sale offer"],
    ["HeartHandshake", HeartHandshake, "Donations & charity", "donate donation charity ngo"],
  ]],
];

export const ICON_GROUPS = LIB.map(([group, icons]) => ({
  group,
  icons: icons.map(([key, , label, words]) => ({ key, label, group, words })),
}));
export const ICON_KEYS = ICON_GROUPS.flatMap((g) => g.icons.map((i) => i.key));
const COMPONENT = Object.fromEntries(
  LIB.flatMap(([, icons]) => icons.map(([key, Comp]) => [key, Comp])),
);
const META = Object.fromEntries(
  ICON_GROUPS.flatMap((g) => g.icons.map((i) => [i.key, i])),
);

/* Older categories may carry a key from the first, smaller list. They all still exist here. */
export const iconLabel = (key) => META[key]?.label || "Everything else";

export function CategoryIcon({ name, size = 18, ...rest }) {
  const I = COMPONENT[name] || Package;
  return <I size={size} strokeWidth={1.7} aria-hidden="true" {...rest} />;
}

/* The icons that best match a category name, best first. Used for "Suggested for …". */
export function suggestIcons(name, limit = 6) {
  const text = String(name || "").toLowerCase();
  const tokens = text.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  if (!tokens.length) return [];
  const scored = [];
  ICON_GROUPS.forEach((g) =>
    g.icons.forEach((i) => {
      const hay = ` ${i.label.toLowerCase()} ${i.words} `;
      let score = 0;
      tokens.forEach((t) => {
        const stem = t.length > 4 ? t.replace(/(es|s)$/, "") : t;
        if (hay.includes(` ${t} `)) score += 3;
        else if (stem.length > 2 && hay.includes(stem)) score += 1;
      });
      if (score) scored.push([score, i]);
    }),
  );
  return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map(([, i]) => i);
}

/* ReOrbit-shaped starter categories: what members donate, what ReMakers create, what people resell. */
export const SUGGESTED_CATEGORIES = [
  { name: "Furniture", icon: "Armchair", blurb: "Chairs, tables, shelves, beds and cabinets", why: "Most donated" },
  { name: "Home Decor", icon: "Lamp", blurb: "Lamps, frames, vases and wall pieces", why: "Popular with ReMakers" },
  { name: "Kitchen & Dining", icon: "UtensilsCrossed", blurb: "Cookware, crockery and utensils", why: "Donations" },
  { name: "Clothing", icon: "Shirt", blurb: "Everyday and festive wear in good condition", why: "Donations" },
  { name: "Fashion & Accessories", icon: "Watch", blurb: "Watches, belts, scarves and more", why: "Resale" },
  { name: "Bags", icon: "Backpack", blurb: "Handbags, backpacks and upcycled totes", why: "ReMaker favourite" },
  { name: "Jewellery", icon: "Gem", blurb: "Handmade and pre-loved jewellery", why: "ReMaker favourite" },
  { name: "Footwear", icon: "Footprints", blurb: "Shoes, sandals and slippers", why: "Resale" },
  { name: "Books & Stationery", icon: "BookOpen", blurb: "Books, notebooks and study supplies", why: "Donations" },
  { name: "Electronics", icon: "Laptop", blurb: "Working phones, laptops and gadgets", why: "Resale" },
  { name: "Toys & Games", icon: "Blocks", blurb: "Toys, puzzles and board games", why: "Donations" },
  { name: "Kids & Baby", icon: "Baby", blurb: "Clothes, strollers and nursery items", why: "Donations" },
  { name: "Sports & Fitness", icon: "Dumbbell", blurb: "Gym gear, cricket and sports kit", why: "Donations" },
  { name: "Art & Craft", icon: "Palette", blurb: "Paintings, craft kits and supplies", why: "ReMaker favourite" },
  { name: "Upcycled Creations", icon: "Sparkles", blurb: "One-of-a-kind pieces made from reused material", why: "Only on ReOrbit" },
  { name: "Plants & Planters", icon: "Sprout", blurb: "Pots, planters and garden decor", why: "ReMaker favourite" },
  { name: "Storage & Organisers", icon: "Boxes", blurb: "Boxes, baskets and organisers", why: "Resale" },
  { name: "Musical Instruments", icon: "Guitar", blurb: "Guitars, keyboards, drums and more", why: "Resale" },
  { name: "Bicycles", icon: "Bike", blurb: "Bikes, cycles and spare parts", why: "Resale" },
  { name: "Pet Supplies", icon: "PawPrint", blurb: "Beds, bowls, toys and carriers", why: "Donations" },
];
