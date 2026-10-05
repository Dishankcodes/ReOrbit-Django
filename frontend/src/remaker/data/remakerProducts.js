/* =========================================================
   REMAKER PRODUCTS - UI MOCK DATA
   Shapes follow the ReMaker_Products table (title, category,
   description, price, stock, status, item_id) so wiring the
   backend later is a straight swap.
   ========================================================= */

export const CATEGORIES = [
  "Furniture",
  "Home Decor",
  "Lighting",
  "Storage & Organisers",
  "Garden & Planters",
  "Kitchen & Dining",
  "Fashion & Accessories",
  "Bags & Totes",
  "Jewellery",
  "Wall Art",
  "Stationery & Books",
  "Kids & Toys",
  "Electronics Reborn",
  "Pet Supplies",
];

export const MATERIAL_SUGGESTIONS = [
  "Reclaimed wood",
  "Teak",
  "Denim",
  "Brass",
  "Glass",
  "Cotton",
  "Metal scrap",
  "Ceramic",
  "Leather",
  "Jute",
];

/* Items the ReMaker bought on ReOrbit (Items.item_id) */
export const ORIGIN_ITEMS = [
  { id: "IT-2041", title: "Old teak wardrobe door", bought: "12 Sep" },
  { id: "IT-2057", title: "Brass-handled drawer set", bought: "3 Sep" },
  { id: "IT-2063", title: "Wrought iron window grille", bought: "28 Aug" },
  { id: "IT-2078", title: "Worn denim jackets (lot of 6)", bought: "19 Aug" },
];

export const PRODUCT_STATUS = {
  Listed: { label: "Active", tone: "active" },
  Inactive: { label: "Inactive", tone: "inactive" },
  Draft: { label: "Draft", tone: "draft" },
  Sold_Out: { label: "Sold out", tone: "soldout" },
};

export const REMAKER_PRODUCTS = [
  {
    id: "rp-1001",
    title: "Teak Door Console Table",
    category: "Furniture",
    description:
      "A hall console built from a 70-year-old teak wardrobe door. We kept the original carved panel, sanded it back to a soft matte, and set it on hand-bent iron legs. Finished with a plant-based wax so the grain stays warm.",
    price: 12500,
    stock: 2,
    status: "Listed",
    images: [
      "/images/portfolio/tara-console.jpg",
      "/images/portfolio/tara-teak-cabinet.jpg",
      "/images/products/teak-drawer-chest.jpg",
      "/images/products/wooden-table.jpg",
    ],
    materials: ["Teak", "Metal scrap"],
    originType: "item",
    originItemId: "IT-2041",
    views: 1240,
    sales: 14,
    updated: "2 days ago",
  },
  {
    id: "rp-1002",
    title: "Reclaimed Wood Floor Lamp",
    category: "Lighting",
    description:
      "Offcuts from a dismantled bookshelf, joined into a tripod stand with a linen shade. The warm bulb shows every knot in the wood. Ships with a braided cloth cable and a dimmer switch.",
    price: 3850,
    stock: 8,
    status: "Listed",
    images: [
      "/images/portfolio/arjun-lamp.jpg",
      "/images/products/ceramic-lamp.jpg",
      "/images/portfolio/arjun-shelf.jpg",
    ],
    materials: ["Reclaimed wood", "Cotton"],
    originType: "own",
    originItemId: "",
    views: 980,
    sales: 36,
    updated: "5 days ago",
  },
  {
    id: "rp-1003",
    title: "Denim Patchwork Tote",
    category: "Bags & Totes",
    description:
      "Six worn denim jackets, cut and pieced into one sturdy everyday tote. Every bag has its own pattern, so yours will not match anyone else's. Lined with cotton and stitched to carry laptops and groceries.",
    price: 1850,
    stock: 0,
    status: "Sold_Out",
    images: [
      "/images/portfolio/priya-bag.jpg",
      "/images/portfolio/priya-jacket.jpg",
      "/images/portfolio/priya-home.jpg",
    ],
    materials: ["Denim", "Cotton"],
    originType: "item",
    originItemId: "IT-2078",
    views: 2310,
    sales: 52,
    updated: "Yesterday",
  },
  {
    id: "rp-1004",
    title: "Iron Grille Wall Shelf",
    category: "Storage & Organisers",
    description:
      "A rusted window grille, wire-brushed and sealed, turned into a wall shelf with a reclaimed pine plank. The pattern throws soft shadows on the wall in the evening.",
    price: 4200,
    stock: 3,
    status: "Inactive",
    images: [
      "/images/portfolio/arjun-metal.jpg",
      "/images/portfolio/arjun-shelf.jpg",
      "/images/products/vintage-chair.jpg",
    ],
    materials: ["Metal scrap", "Reclaimed wood"],
    originType: "item",
    originItemId: "IT-2063",
    views: 410,
    sales: 6,
    updated: "2 weeks ago",
  },
  {
    id: "rp-1005",
    title: "Cane-Back Accent Chair",
    category: "Furniture",
    description:
      "",
    price: 0,
    stock: 1,
    status: "Draft",
    images: ["/images/portfolio/tara-chair.jpg", "/images/products/vintage-chair.jpg"],
    materials: [],
    originType: "own",
    originItemId: "",
    views: 0,
    sales: 0,
    updated: "Today",
  },
];

export function getProductById(id) {
  return REMAKER_PRODUCTS.find((product) => product.id === id) || null;
}

export function formatPrice(value) {
  const amount = Number(value);

  if (!amount || Number.isNaN(amount)) {
    return "₹0";
  }

  return `₹${amount.toLocaleString("en-IN")}`;
}
