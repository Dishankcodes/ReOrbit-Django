export const CATEGORIES = [
  "Furniture",
  "Electronics",
  "Home & Living",
  "Clothing",
  "Books",
  "Decor",
];

export const ITEMS = [
  {
    id: "teak-drawer-chest",
    title: "Teak drawer chest, 1970s",
    category: "Furniture",
    price: 4200,
    image: "/images/products/teak-drawer-chest.jpg",
    summary:
      "Solid teak four-drawer chest with original brass pulls. Sun-faded top panel, structurally sound.",
    city: "Bengaluru",
    pincode: "560034",
    co2SavedKg: 62,
    sellerRating: 4.8,
    condition: "Good",
    seller: "Meera Iyer",
  },

  {
    id: "vintage-reading-chair",
    title: "Vintage reading chair",
    category: "Furniture",
    price: 2800,
    image: "/images/products/vintage-chair.jpg",
    summary:
      "A classic wooden reading chair with a restored frame and freshly finished seat.",
    city: "Pune",
    pincode: "411007",
    co2SavedKg: 38,
    sellerRating: 4.7,
    condition: "Very Good",
    seller: "Rohan Shah",
  },

  {
    id: "ceramic-table-lamp",
    title: "Handmade ceramic table lamp",
    category: "Home & Living",
    price: 1650,
    image: "/images/products/ceramic-lamp.jpg",
    summary:
      "Warm ceramic table lamp with a handmade textured base and carefully restored wiring.",
    city: "Ahmedabad",
    pincode: "380015",
    co2SavedKg: 12,
    sellerRating: 4.9,
    condition: "Excellent",
    seller: "Aarav Patel",
  },

  {
    id: "solid-wood-side-table",
    title: "Solid wood side table",
    category: "Furniture",
    price: 2200,
    image: "/images/products/wooden-table.jpg",
    summary:
      "Compact solid-wood side table with natural grain, restored legs, and a smooth finish.",
    city: "Mumbai",
    pincode: "400050",
    co2SavedKg: 31,
    sellerRating: 4.6,
    condition: "Good",
    seller: "Nisha Rao",
  },

  {
    id: "refurbished-desk-lamp",
    title: "Refurbished desk lamp",
    category: "Electronics",
    price: 950,
    image: "/images/products/default-item.jpg",
    summary:
      "Compact desk lamp cleaned, tested, and refurbished for everyday workspace use.",
    city: "Delhi",
    pincode: "110016",
    co2SavedKg: 8,
    sellerRating: 4.7,
    condition: "Very Good",
    seller: "Kabir Verma",
  },

  {
    id: "cotton-handloom-jacket",
    title: "Upcycled cotton jacket",
    category: "Clothing",
    price: 1450,
    image: "/images/products/default-item.jpg",
    summary:
      "A comfortable cotton jacket created using recovered textile material and careful stitching.",
    city: "Jaipur",
    pincode: "302017",
    co2SavedKg: 6,
    sellerRating: 4.9,
    condition: "Excellent",
    seller: "Anaya Singh",
  },

  {
    id: "classic-novel-collection",
    title: "Classic novel collection",
    category: "Books",
    price: 750,
    image: "/images/products/default-item.jpg",
    summary:
      "A curated collection of classic novels looking for a new bookshelf and reader.",
    city: "Kolkata",
    pincode: "700029",
    co2SavedKg: 5,
    sellerRating: 4.8,
    condition: "Good",
    seller: "Tara Bose",
  },

  {
    id: "reclaimed-wall-decor",
    title: "Reclaimed wood wall decor",
    category: "Decor",
    price: 1250,
    image: "/images/products/default-item.jpg",
    summary:
      "Decorative wall piece made from reclaimed wood with a natural finish and minimal design.",
    city: "Surat",
    pincode: "395007",
    co2SavedKg: 14,
    sellerRating: 4.8,
    condition: "Excellent",
    seller: "Priya Shah",
  },
];

export const REMAKERS = [
  {
    id: "tara-bose",
    name: "Tara Bose",
    craft: "Furniture & Wood Restoration",
    bio: "Transforms rescued furniture into functional pieces while preserving the character and history of the original material.",
    itemsRescued: 42,
    city: "Kolkata",
    image: "/images/remakers/tara-bose.jpg",
    rating: 4.9,
  },

  {
    id: "arjun-mehta",
    name: "Arjun Mehta",
    craft: "Upcycled Home Decor",
    bio: "Creates modern home pieces from overlooked materials, combining practical design with responsible making.",
    itemsRescued: 36,
    city: "Ahmedabad",
    image: "/images/remakers/arjun-mehta.jpg",
    rating: 4.8,
  },

  {
    id: "priya-shah",
    name: "Priya Shah",
    craft: "Textile & Lifestyle",
    bio: "Turns recovered fabrics and discarded textiles into useful lifestyle products with a focus on thoughtful design.",
    itemsRescued: 51,
    city: "Mumbai",
    image: "/images/remakers/priya-shah.jpg",
    rating: 4.9,
  },
];

export const IMPACT = {
  itemsRescued: 1284,
  co2SavedTonnes: 47.6,
  remakersOnboarded: 36,
  pincodesServed: 25,
};

export const CONDITIONS = ["Excellent", "Very Good", "Good"];

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

export function getRemakerById(id) {
  return REMAKERS.find((remaker) => remaker.id === id);
}

export function getCategoryCount(category) {
  return ITEMS.filter((item) => item.category === category).length;
}
