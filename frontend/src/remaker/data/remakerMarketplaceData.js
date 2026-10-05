/* =========================================================
   REMAKER MARKETPLACE - UI DATA
   Built on top of the shared marketplace data so ReMakers see
   the same listings users see, plus the extra details a
   ReMaker needs before buying (materials, size, rework ideas).

   source "user"    -> Items table (a person's reusable item)
   source "remaker" -> ReMaker_Products table (finished piece)
   ========================================================= */

import {
  ITEMS,
  formatPrice,
  getSellerFromItem,
  getSellerReviews,
} from "../../data/marketplaceData";

export { formatPrice, getSellerReviews };

const IMG = "/images/";

const EXTRA = {
  "teak-drawer-chest": {
    gallery: ["products/teak-drawer-chest.jpg", "portfolio/tara-teak-cabinet.jpg", "products/wooden-table.jpg"],
    materials: ["Solid teak", "Brass pulls"],
    dimensions: "92 × 45 × 78 cm",
    age: "About 50 years old",
    ideas: ["Entry console", "Wall shelf from the drawers", "Planter stand"],
  },
  "vintage-reading-chair": {
    gallery: ["products/vintage-chair.jpg", "portfolio/tara-chair.jpg", "products/wooden-table.jpg"],
    materials: ["Hardwood frame", "Wooden seat"],
    dimensions: "58 × 60 × 92 cm",
    age: "About 30 years old",
    ideas: ["Reupholstered accent chair", "Cane-back redo", "Garden seat"],
  },
  "ceramic-table-lamp": {
    gallery: ["products/ceramic-lamp.jpg", "portfolio/arjun-lamp.jpg", "products/default-item.jpg"],
    materials: ["Glazed ceramic", "Copper wiring"],
    dimensions: "Ø 24 × 41 cm",
    age: "Made in 2022",
    ideas: ["New linen shade", "Pendant conversion", "Planter base"],
  },
  "solid-wood-side-table": {
    gallery: ["products/wooden-table.jpg", "portfolio/tara-console.jpg", "products/vintage-chair.jpg"],
    materials: ["Solid sheesham"],
    dimensions: "45 × 45 × 55 cm",
    age: "About 15 years old",
    ideas: ["Resin-inlay top", "Painted accent table", "Bedside with a drawer"],
  },
  "refurbished-desk-lamp": {
    gallery: ["products/default-item.jpg", "products/ceramic-lamp.jpg"],
    materials: ["Steel arm", "LED holder"],
    dimensions: "18 × 18 × 46 cm",
    age: "About 4 years old",
    ideas: ["Industrial wall sconce", "Brass-finish respray", "Cable-art piece"],
  },
  "cotton-handloom-jacket": {
    gallery: ["portfolio/priya-jacket.jpg", "portfolio/priya-bag.jpg", "portfolio/priya-home.jpg"],
    materials: ["Handloom cotton", "Cotton lining"],
    dimensions: "Size M, chest 98 cm",
    age: "Made in 2025",
    ideas: ["Patchwork tote", "Cushion covers", "Kids' jacket"],
  },
  "classic-novel-collection": {
    gallery: ["products/default-item.jpg", "portfolio/priya-home.jpg"],
    materials: ["Paper", "Cloth-bound covers"],
    dimensions: "12 books, 20 × 13 cm each",
    age: "Mixed, 1980s to 2000s",
    ideas: ["Book-page lampshade", "Hidden-book box", "Paper-craft panels"],
  },
  "reclaimed-wall-decor": {
    gallery: ["portfolio/arjun-shelf.jpg", "portfolio/arjun-metal.jpg", "products/wooden-table.jpg"],
    materials: ["Reclaimed pine", "Natural oil finish"],
    dimensions: "90 × 30 × 4 cm",
    age: "New, from old wood",
    madeFrom: "Floor joists from a 1960s house in Surat",
  },
  "restored-teak-cabinet": {
    gallery: ["portfolio/tara-teak-cabinet.jpg", "products/teak-drawer-chest.jpg", "portfolio/tara-console.jpg", "portfolio/tara-chair.jpg"],
    materials: ["Teak", "Original brass hinges", "Plant-based wax"],
    dimensions: "110 × 40 × 85 cm",
    age: "Restored in 2026",
    madeFrom: "A teak cabinet rescued from a Kolkata home clear-out",
  },
  "reclaimed-wood-shelf": {
    gallery: ["portfolio/arjun-shelf.jpg", "portfolio/arjun-metal.jpg", "portfolio/arjun-lamp.jpg"],
    materials: ["Reclaimed wood", "Iron brackets"],
    dimensions: "75 × 22 × 18 cm",
    age: "New, from old wood",
    madeFrom: "Offcuts from a dismantled bookshelf",
  },
  "upcycled-home-lamp": {
    gallery: ["portfolio/arjun-lamp.jpg", "products/ceramic-lamp.jpg", "portfolio/arjun-metal.jpg"],
    materials: ["Recovered steel", "Brass", "Cloth cable"],
    dimensions: "Ø 20 × 52 cm",
    age: "New, from old parts",
    madeFrom: "An old industrial machine part",
  },
  "recovered-textile-bag": {
    gallery: ["portfolio/priya-bag.jpg", "portfolio/priya-jacket.jpg", "portfolio/priya-home.jpg"],
    materials: ["Recovered cotton", "Canvas lining"],
    dimensions: "38 × 32 × 12 cm",
    age: "New, from old fabric",
    madeFrom: "Discarded upholstery and denim offcuts",
  },
};

export const SERVICEABLE_PINCODES = [
  "380015", "380001", "380009", "380016", "560034", "411007",
  "400050", "110016", "302017", "700029", "395007",
];

/* ReOrbit-managed delivery is chargeable (Items.pickup_preference) */
export function deliveryCharge(price) {
  if (price < 1500) return 99;
  if (price < 5000) return 199;
  return 349;
}

export const MARKET_LISTINGS = ITEMS.map((item) => {
  const extra = EXTRA[item.id] || {};
  const gallery = (extra.gallery || []).map((path) => IMG + path);

  return {
    ...item,
    source: item.sellerType === "remaker" ? "remaker" : "user",
    gallery: gallery.length ? gallery : [item.image],
    materials: extra.materials || [],
    dimensions: extra.dimensions || "",
    age: extra.age || "",
    ideas: extra.ideas || [],
    madeFrom: extra.madeFrom || "",
  };
});

export const SOURCE_LABEL = {
  user: "Community item",
  remaker: "ReMaker piece",
};

export const MARKET_CATEGORIES = [...new Set(MARKET_LISTINGS.map((l) => l.category))].sort();

export const CONDITIONS = ["Excellent", "Very Good", "Good"];

export const SORTS = [
  { key: "newest", label: "Newest first" },
  { key: "popular", label: "Most saved" },
  { key: "price-low", label: "Price: low to high" },
  { key: "price-high", label: "Price: high to low" },
];

export function sortListings(list, key) {
  const copy = [...list];

  if (key === "popular") return copy.sort((a, b) => b.likes - a.likes);
  if (key === "price-low") return copy.sort((a, b) => a.price - b.price);
  if (key === "price-high") return copy.sort((a, b) => b.price - a.price);

  return copy.sort((a, b) => b.listedDate.localeCompare(a.listedDate));
}

export function getListingById(id) {
  return MARKET_LISTINGS.find((listing) => listing.id === id) || null;
}

export function getSeller(listing) {
  return getSellerFromItem(listing);
}

export function getRelatedListings(listing, limit = 4) {
  const same = MARKET_LISTINGS.filter(
    (other) => other.id !== listing.id && other.category === listing.category,
  );
  const rest = MARKET_LISTINGS.filter(
    (other) => other.id !== listing.id && other.category !== listing.category,
  );

  return [...same, ...rest].slice(0, limit);
}
