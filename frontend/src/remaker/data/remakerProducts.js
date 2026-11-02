/* =========================================================
   REMAKER PRODUCTS - UI MOCK DATA
   Shapes follow the ReMaker_Products table (title, category,
   description, price, stock, status, item_id) so wiring the
   backend later is a straight swap.
   ========================================================= */

/* Fallback only. The forms read the live list from Admin > Content
   (see shared/catalog.js). */
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
    adminId: "PRD-20025",
    title: "Teak Door Console Table",
    category: "Furniture",
    description:
      "A hall console built from a 70-year-old teak wardrobe door. We kept the original carved panel, sanded it back to a soft matte, and set it on hand-bent iron legs. Finished with a plant-based wax so the grain stays warm.",
    price: 12500,
    stock: 2,
    status: "Listed",
    images: [
      "https://images.pexels.com/photos/177143/pexels-photo-177143.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/5824819/pexels-photo-5824819.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/5825540/pexels-photo-5825540.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/8134812/pexels-photo-8134812.jpeg?auto=compress&cs=tinysrgb&w=1000",
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
      "https://images.pexels.com/photos/6825324/pexels-photo-6825324.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/1643280/pexels-photo-1643280.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/34237532/pexels-photo-34237532.jpeg?auto=compress&cs=tinysrgb&w=1000",
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
    category: "Fashion",
    description:
      "Six worn denim jackets, cut and pieced into one sturdy everyday tote. Every bag has its own pattern, so yours will not match anyone else's. Lined with cotton and stitched to carry laptops and groceries.",
    price: 1850,
    stock: 0,
    status: "Sold_Out",
    images: [
      "https://images.pexels.com/photos/10566057/pexels-photo-10566057.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/10566057/pexels-photo-10566057.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/3185223/pexels-photo-3185223.jpeg?auto=compress&cs=tinysrgb&w=1000",
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
    category: "Home Decor",
    description:
      "A rusted window grille, wire-brushed and sealed, turned into a wall shelf with a reclaimed pine plank. The pattern throws soft shadows on the wall in the evening.",
    price: 4200,
    stock: 3,
    status: "Inactive",
    images: [
      "https://images.pexels.com/photos/4503943/pexels-photo-4503943.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/3664343/pexels-photo-3664343.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/19109111/pexels-photo-19109111.jpeg?auto=compress&cs=tinysrgb&w=1000",
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
    description: "",
    price: 0,
    stock: 1,
    status: "Draft",
    images: [
      "https://images.pexels.com/photos/1148955/pexels-photo-1148955.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/14792097/pexels-photo-14792097.jpeg?auto=compress&cs=tinysrgb&w=1000",
    ],
    materials: [],
    originType: "own",
    originItemId: "",
    views: 0,
    sales: 0,
    updated: "Today",
  },
  {
    id: "rp-1006",
    adminId: "PRD-20026",
    title: "Refurbished Study Chair",
    category: "Furniture",
    description:
      "A school-era study chair stripped, re-glued and finished in natural oil. New webbing seat, original frame.",
    price: 3399,
    stock: 4,
    status: "Listed",
    images: ["https://images.pexels.com/photos/14792097/pexels-photo-14792097.jpeg?auto=compress&cs=tinysrgb&w=1000", "https://images.pexels.com/photos/14792097/pexels-photo-14792097.jpeg?auto=compress&cs=tinysrgb&w=1000"],
    materials: ["Reclaimed wood", "Jute"],
    originType: "own",
    originItemId: "",
    views: 320,
    sales: 3,
    updated: "4 days ago",
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
