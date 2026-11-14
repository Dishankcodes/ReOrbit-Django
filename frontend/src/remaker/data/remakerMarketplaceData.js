/* =========================================================
   REMAKER MARKETPLACE - UI DATA
   Built on top of the shared marketplace data so ReMakers see
   the same listings users see, plus the extra details a
   ReMaker needs before buying (materials, size, rework ideas).

   source "user"    -> Items table (a person's reusable item)
   source "remaker" -> ReMaker_Products table (finished piece)
   ========================================================= */

import { deliveryFor } from "../../shared/commerce";
import {
  ITEMS,
  formatPrice,
  getSellerFromItem,
  getSellerById,
} from "../../data/marketplaceData";

export { formatPrice };

const IMG = "/images/";

const EXTRA = {
  "teak-drawer-chest": {
    gallery: [
      "https://images.pexels.com/photos/177143/pexels-photo-177143.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/5824819/pexels-photo-5824819.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/34658646/pexels-photo-34658646.jpeg?auto=compress&cs=tinysrgb&w=1000",
    ],
    materials: ["Solid teak", "Brass pulls"],
    dimensions: "92 × 45 × 78 cm",
    age: "About 50 years old",
    ideas: ["Entry console", "Wall shelf from the drawers", "Planter stand"],
  },

  "vintage-reading-chair": {
    gallery: [
      "https://images.pexels.com/photos/14792097/pexels-photo-14792097.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/696407/pexels-photo-696407.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/11112739/pexels-photo-11112739.jpeg?auto=compress&cs=tinysrgb&w=1000",
    ],
    materials: ["Hardwood frame", "Wooden seat"],
    dimensions: "58 × 60 × 92 cm",
    age: "About 30 years old",
    ideas: ["Reupholstered accent chair", "Cane-back redo", "Garden seat"],
  },

  "ceramic-table-lamp": {
    gallery: [
      "https://images.pexels.com/photos/8263851/pexels-photo-8263851.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/1112598/pexels-photo-1112598.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/7679454/pexels-photo-7679454.jpeg?auto=compress&cs=tinysrgb&w=1000",
    ],
    materials: ["Glazed ceramic", "Copper wiring"],
    dimensions: "Ø 24 × 41 cm",
    age: "Made in 2022",
    ideas: ["New linen shade", "Pendant conversion", "Planter base"],
  },

  "solid-wood-side-table": {
    gallery: [
      "https://images.pexels.com/photos/11112739/pexels-photo-11112739.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/8251682/pexels-photo-8251682.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/14792097/pexels-photo-14792097.jpeg?auto=compress&cs=tinysrgb&w=1000",
    ],
    materials: ["Solid sheesham"],
    dimensions: "45 × 45 × 55 cm",
    age: "About 15 years old",
    ideas: ["Resin-inlay top", "Painted accent table", "Bedside with a drawer"],
  },

  "refurbished-desk-lamp": {
    gallery: [
      "https://images.pexels.com/photos/7679725/pexels-photo-7679725.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/177143/pexels-photo-177143.jpeg?auto=compress&cs=tinysrgb&w=1000",
    ],
    materials: ["Steel arm", "LED holder"],
    dimensions: "18 × 18 × 46 cm",
    age: "About 4 years old",
    ideas: [
      "Industrial wall sconce",
      "Brass-finish respray",
      "Cable-art piece",
    ],
  },

  "cotton-handloom-jacket": {
    gallery: [
      "https://images.pexels.com/photos/9316208/pexels-photo-9316208.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/3185223/pexels-photo-3185223.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/8762879/pexels-photo-8762879.jpeg?auto=compress&cs=tinysrgb&w=1000",
    ],
    materials: ["Handloom cotton", "Cotton lining"],
    dimensions: "Size M, chest 98 cm",
    age: "Made in 2025",
    ideas: ["Patchwork tote", "Cushion covers", "Kids' jacket"],
  },

  "classic-novel-collection": {
    gallery: [
      "https://images.pexels.com/photos/16390583/pexels-photo-16390583.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/5824819/pexels-photo-5824819.jpeg?auto=compress&cs=tinysrgb&w=1000",
    ],
    materials: ["Paper", "Cloth-bound covers"],
    dimensions: "12 books, 20 × 13 cm each",
    age: "Mixed, 1980s to 2000s",
    ideas: ["Book-page lampshade", "Hidden-book box", "Paper-craft panels"],
  },

  "reclaimed-wall-decor": {
    gallery: [
      "https://images.pexels.com/photos/19109111/pexels-photo-19109111.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/10945653/pexels-photo-10945653.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/12277213/pexels-photo-12277213.jpeg?auto=compress&cs=tinysrgb&w=1000",
    ],
    materials: ["Reclaimed pine", "Natural oil finish"],
    dimensions: "90 × 30 × 4 cm",
    age: "New, from old wood",
    madeFrom: "Floor joists from a 1960s house in Surat",
  },

  "restored-teak-cabinet": {
    gallery: [
      "https://images.pexels.com/photos/177143/pexels-photo-177143.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/5824819/pexels-photo-5824819.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/34658646/pexels-photo-34658646.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/2168227/pexels-photo-2168227.jpeg?auto=compress&cs=tinysrgb&w=1000",
    ],
    materials: ["Teak", "Original brass hinges", "Plant-based wax"],
    dimensions: "110 × 40 × 85 cm",
    age: "Restored in 2026",
    madeFrom: "A teak cabinet rescued from a Kolkata home clear-out",
  },

  "reclaimed-wood-shelf": {
    gallery: [
      "https://images.pexels.com/photos/3664343/pexels-photo-3664343.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/15602670/pexels-photo-15602670.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/8263851/pexels-photo-8263851.jpeg?auto=compress&cs=tinysrgb&w=1000",
    ],
    materials: ["Reclaimed wood", "Iron brackets"],
    dimensions: "75 × 22 × 18 cm",
    age: "New, from old wood",
    madeFrom: "Offcuts from a dismantled bookshelf",
  },

  "upcycled-home-lamp": {
    gallery: [
      "https://images.pexels.com/photos/33375682/pexels-photo-33375682.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/8263851/pexels-photo-8263851.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/15602670/pexels-photo-15602670.jpeg?auto=compress&cs=tinysrgb&w=1000",
    ],
    materials: ["Recovered steel", "Brass", "Cloth cable"],
    dimensions: "Ø 20 × 52 cm",
    age: "New, from old parts",
    madeFrom: "An old industrial machine part",
  },

  "recovered-textile-bag": {
    gallery: [
      "https://images.pexels.com/photos/3185223/pexels-photo-3185223.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/8266834/pexels-photo-8266834.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/8762879/pexels-photo-8762879.jpeg?auto=compress&cs=tinysrgb&w=1000",
    ],
    materials: ["Recovered cotton", "Canvas lining"],
    dimensions: "38 × 32 × 12 cm",
    age: "New, from old fabric",
    madeFrom: "Discarded upholstery and denim offcuts",
  },
};

/* =========================================================
   SERVICEABLE PINCODES
========================================================= */

export const SERVICEABLE_PINCODES = [
  "380015",
  "380001",
  "380009",
  "380016",
  "560034",
  "411007",
  "400050",
  "110016",
  "302017",
  "700029",
  "395007",
];

/* =========================================================
   DELIVERY
========================================================= */

/* ReOrbit-managed delivery is chargeable (Items.pickup_preference) */

/* Rates come from Admin > Settings > Commerce (shared/commerce.js):
   ReMaker products ship for the product rate (free over the limit),
   member items use the item rate. `source` is "remaker" or "user". */
export function deliveryCharge(price, source = "remaker") {
  return deliveryFor({
    sellerType: source === "remaker" ? "remaker" : "user",
    pickup: "platform",
    subtotal: price,
  });
}

/* =========================================================
   MARKET LISTINGS
========================================================= */

const decorate = (item) => {
  const extra = EXTRA[item.id] || {};

  const gallery = (extra.gallery || []).map((path) =>
    path.startsWith("http") ? path : IMG + path,
  );

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
};

export const MARKET_LISTINGS = ITEMS.map(decorate);

/* Called when a member publishes or withdraws a listing, so the ReMaker
   marketplace (which reads this array) shows it straight away. */
export function refreshMarketListings() {
  MARKET_LISTINGS.splice(0, MARKET_LISTINGS.length, ...ITEMS.map(decorate));
}

/* =========================================================
   SOURCE LABEL
========================================================= */

export const SOURCE_LABEL = {
  user: "Community item",
  remaker: "ReMaker piece",
};

/* =========================================================
   MARKETPLACE CATEGORIES
========================================================= */

export const MARKET_CATEGORIES = [
  ...new Set(MARKET_LISTINGS.map((listing) => listing.category)),
].sort();

export const CONDITIONS = ["Excellent", "Very Good", "Good"];

export const SORTS = [
  {
    key: "newest",
    label: "Newest first",
  },
  {
    key: "popular",
    label: "Most saved",
  },
  {
    key: "price-low",
    label: "Price: low to high",
  },
  {
    key: "price-high",
    label: "Price: high to low",
  },
];

/* =========================================================
   SORT LISTINGS
========================================================= */

export function sortListings(list, key) {
  const copy = [...list];

  if (key === "popular") {
    return copy.sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0));
  }

  if (key === "price-low") {
    return copy.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  }

  if (key === "price-high") {
    return copy.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  }

  return copy.sort((a, b) =>
    String(b.listedDate || "").localeCompare(String(a.listedDate || "")),
  );
}

/* =========================================================
   GET LISTING BY ID
========================================================= */

export function getListingById(id) {
  return (
    MARKET_LISTINGS.find((listing) => String(listing.id) === String(id)) || null
  );
}

/* =========================================================
   GET SELLER
========================================================= */

export function getSeller(listing) {
  if (!listing) {
    return null;
  }

  return getSellerFromItem(listing);
}

/* =========================================================
   GET SELLER PROFILE
   ---------------------------------------------------------
   ReMakerSellerProfile.jsx expects:

   {
     type: "remaker" | "user",
     data: seller object
   }
========================================================= */

export function getSellerProfile(sellerId) {
  if (sellerId === undefined || sellerId === null || sellerId === "") {
    return null;
  }

  const id = String(sellerId);

  /*
   * First look directly through all marketplace listings.
   * This also lets us determine whether the seller is a
   * community user or a ReMaker.
   */
  const listing = MARKET_LISTINGS.find((item) => String(item.sellerId) === id);

  if (listing) {
    const seller = getSellerFromItem(listing);

    if (seller) {
      return {
        type: seller.sellerType === "remaker" ? "remaker" : "user",

        data: seller,
      };
    }
  }

  /*
   * Fallback to the shared seller lookup.
   *
   * ReMaker IDs such as:
   * tara-bose
   * arjun-mehta
   * priya-shah

   * User IDs such as:
   * user-meera-iyer
   * user-rohan-shah
   */
  const possibleSeller = getSellerById(id);

  if (possibleSeller) {
    return {
      type: possibleSeller.sellerType === "remaker" ? "remaker" : "user",

      data: possibleSeller,
    };
  }

  return null;
}

/* =========================================================
   GET LISTINGS BY SELLER
========================================================= */

export function getListingsBySeller(sellerId) {
  if (sellerId === undefined || sellerId === null || sellerId === "") {
    return [];
  }

  const id = String(sellerId);

  return MARKET_LISTINGS.filter((listing) => String(listing.sellerId) === id);
}

/* =========================================================
   GET RELATED LISTINGS
========================================================= */

export function getRelatedListings(listing, limit = 4) {
  if (!listing) {
    return [];
  }

  const same = MARKET_LISTINGS.filter(
    (other) => other.id !== listing.id && other.category === listing.category,
  );

  const rest = MARKET_LISTINGS.filter(
    (other) => other.id !== listing.id && other.category !== listing.category,
  );

  return [...same, ...rest].slice(0, limit);
}

/* =========================================================
   REVIEW SUMMARY
========================================================= */

export function summarizeReviews(reviews = []) {
  const distribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  if (!Array.isArray(reviews) || reviews.length === 0) {
    return {
      average: 0,
      count: 0,
      distribution,
    };
  }

  let validRatingCount = 0;
  let totalRating = 0;

  reviews.forEach((review) => {
    const rating = Number(review?.rating);

    if (Number.isFinite(rating) && rating >= 1 && rating <= 5) {
      const roundedRating = Math.round(rating);

      distribution[roundedRating] += 1;

      totalRating += rating;
      validRatingCount += 1;
    }
  });

  const average =
    validRatingCount > 0
      ? Number((totalRating / validRatingCount).toFixed(1))
      : 0;

  return {
    average,
    count: validRatingCount,
    distribution,
  };
}
