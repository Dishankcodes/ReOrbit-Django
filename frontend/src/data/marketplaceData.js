/* Fallback only. Pages read the live list from Admin > Content (shared/catalog.js). */
export const CATEGORIES = [
  "Furniture",
  "Electronics",
  "Home Decor",
  "Clothing",
  "Books",
];

export const CONDITIONS = ["Excellent", "Very Good", "Good"];

/* Filled from the server by setLiveItems (below). No sample listings. */
export const ITEMS = [];

export function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function getItemById(id) {
  return ITEMS.find((item) => item.id === id);
}

export function getProductsBySeller(sellerId) {
  return ITEMS.filter((item) => item.sellerId === sellerId);
}

/* ---------- live listings from the server (/api/marketplace/) ----------
   The marketplace screens, cart and wishlist all read ITEMS, so live rows are
   swapped into that same array in place (marked live: true). */
/* one /api/marketplace/ card -> the item shape the marketplace screens read */
export const cardToItem = (c) => ({
  id: c.id,
  live: true,
  title: c.title,
  category: c.category.name,
  price: Number(c.price) || 0,
  /* ReOrbit store items below their original price: struck-through MRP, "20% off", no coupons */
  mrp: c.mrp ? Number(c.mrp) : null,
  off: c.off || 0,
  image: c.cover || "",
  summary: c.summary || "",
  description: c.summary || "",
  city: c.city || "Gujarat",
  pincode: "",
  co2SavedKg: 0,
  sellerRating: 0,
  condition: c.condition || (c.seller.type === "user" ? "Good" : "Brand new"),
  seller: c.seller.name,
  sellerId: c.seller.id || "",
  sellerType: c.seller.type,
  sellerImage: "",
  quantity: c.stock,
  soldOut: c.sold_out,
  returnable: c.returnable !== false,
  views: c.views || 0,
  likes: c.saves || 0,
  listedDate: c.created_at,
});

export function setLiveItems(cards) {
  for (let i = ITEMS.length - 1; i >= 0; i -= 1)
    if (ITEMS[i].live) ITEMS.splice(i, 1);
  ITEMS.unshift(...cards.map(cardToItem));
}
