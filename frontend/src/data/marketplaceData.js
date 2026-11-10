/* Fallback only. Pages read the live list from Admin > Content (shared/catalog.js). */
export const CATEGORIES = [
  "Furniture",
  "Electronics",
  "Home Decor",
  "Clothing",
  "Books",
];

export const CONDITIONS = ["Excellent", "Very Good", "Good"];

export const SELLER_TYPES = {
  USER: "user",
  REMAKER: "remaker",
};

export const USERS = [
  {
    id: "user-meera-iyer",
    name: "Meera Iyer",
    username: "meera_iyer",
    email: "meera@example.com",
    city: "Bengaluru",
    pincode: "560034",
    image: "/images/users/meera-iyer.jpg",
    rating: 4.8,
    totalReviews: 24,
    productsSold: 18,
    joined: "2025",
    bio: "I love giving pre-loved furniture a second life and finding good homes for things I no longer need.",
    sellerType: "user",
  },
  {
    id: "user-rohan-shah",
    name: "Rohan Shah",
    username: "rohan_shah",
    email: "rohan@example.com",
    city: "Pune",
    pincode: "411007",
    image: "/images/users/rohan-shah.jpg",
    rating: 4.7,
    totalReviews: 19,
    productsSold: 14,
    joined: "2025",
    bio: "Furniture enthusiast selling carefully maintained pieces from my collection.",
    sellerType: "user",
  },
  {
    id: "user-aarav-patel",
    name: "Aarav Patel",
    username: "aarav_patel",
    email: "aarav@example.com",
    city: "Ahmedabad",
    pincode: "380015",
    image: "/images/users/aarav-patel.jpg",
    rating: 4.9,
    totalReviews: 31,
    productsSold: 27,
    joined: "2024",
    bio: "I enjoy finding useful products that deserve another life instead of ending up as waste.",
    sellerType: "user",
  },
  {
    id: "user-nisha-rao",
    name: "Nisha Rao",
    username: "nisha_rao",
    email: "nisha@example.com",
    city: "Mumbai",
    pincode: "400050",
    image: "/images/users/nisha-rao.jpg",
    rating: 4.6,
    totalReviews: 16,
    productsSold: 11,
    joined: "2025",
    bio: "Sharing beautiful pre-loved pieces and home items with the ReOrbit community.",
    sellerType: "user",
  },
  {
    id: "user-kabir-verma",
    name: "Kabir Verma",
    username: "kabir_verma",
    email: "kabir@example.com",
    city: "Delhi",
    pincode: "110016",
    image: "/images/users/kabir-verma.jpg",
    rating: 4.7,
    totalReviews: 12,
    productsSold: 9,
    joined: "2026",
    bio: "I refurbish and resell useful electronics and workspace accessories.",
    sellerType: "user",
  },
  {
    id: "user-anaya-singh",
    name: "Anaya Singh",
    username: "anaya_singh",
    email: "anaya@example.com",
    city: "Jaipur",
    pincode: "302017",
    image: "/images/users/anaya-singh.jpg",
    rating: 4.9,
    totalReviews: 28,
    productsSold: 21,
    joined: "2024",
    bio: "I enjoy working with recovered textiles and giving clothing a fresh purpose.",
    sellerType: "user",
  },
];

export const REMAKERS = [
  {
    id: "tara-bose",
    name: "Tara Bose",
    username: "tara_bose",
    email: "tara@example.com",
    craft: "Furniture & Wood Restoration",
    bio: "Transforms rescued furniture into functional pieces while preserving the character and history of the original material.",
    itemsRescued: 42,
    city: "Kolkata",
    pincode: "700029",
    image: "/images/remakers/tara-bose.jpg",
    rating: 4.9,
    totalReviews: 87,
    followers: 1240,
    productsCount: 18,
    yearsOfExperience: 7,
    sellerType: "remaker",
    verified: true,
    portfolio: [
      {
        id: "tara-portfolio-1",
        title: "Restored Teak Cabinet",
        image: "https://images.pexels.com/photos/8134812/pexels-photo-8134812.jpeg?auto=compress&cs=tinysrgb&w=1000",
        description:
          "A rescued teak cabinet restored while preserving its original character.",
      },
      {
        id: "tara-portfolio-2",
        title: "Vintage Chair Restoration",
        image: "https://images.pexels.com/photos/1148955/pexels-photo-1148955.jpeg?auto=compress&cs=tinysrgb&w=1000",
        description:
          "A damaged vintage chair transformed into a functional statement piece.",
      },
      {
        id: "tara-portfolio-3",
        title: "Reclaimed Wood Console",
        image: "https://images.pexels.com/photos/8134812/pexels-photo-8134812.jpeg?auto=compress&cs=tinysrgb&w=1000",
        description:
          "A console created using reclaimed wood from an old structure.",
      },
    ],
  },
  {
    id: "arjun-mehta",
    name: "Arjun Mehta",
    username: "arjun_mehta",
    email: "arjun@example.com",
    craft: "Upcycled Home Decor",
    bio: "Creates modern home pieces from overlooked materials, combining practical design with responsible making.",
    itemsRescued: 36,
    city: "Ahmedabad",
    pincode: "380015",
    image: "/images/remakers/arjun-mehta.jpg",
    rating: 4.8,
    totalReviews: 64,
    followers: 980,
    productsCount: 15,
    yearsOfExperience: 5,
    sellerType: "remaker",
    verified: true,
    portfolio: [
      {
        id: "arjun-portfolio-1",
        title: "Reclaimed Wood Shelf",
        image: "https://images.pexels.com/photos/4503943/pexels-photo-4503943.jpeg?auto=compress&cs=tinysrgb&w=1000",
        description: "A minimal wall shelf made from recovered wood.",
      },
      {
        id: "arjun-portfolio-2",
        title: "Upcycled Lamp",
        image: "https://images.pexels.com/photos/1643280/pexels-photo-1643280.jpeg?auto=compress&cs=tinysrgb&w=1000",
        description:
          "An old industrial component transformed into a modern lamp.",
      },
      {
        id: "arjun-portfolio-3",
        title: "Recycled Metal Decor",
        image: "https://images.pexels.com/photos/15602670/pexels-photo-15602670.jpeg?auto=compress&cs=tinysrgb&w=1000",
        description: "Decorative artwork made using recovered metal pieces.",
      },
    ],
  },
  {
    id: "priya-shah",
    name: "Priya Shah",
    username: "priya_shah",
    email: "priya@example.com",
    craft: "Textile & Lifestyle",
    bio: "Turns recovered fabrics and discarded textiles into useful lifestyle products with a focus on thoughtful design.",
    itemsRescued: 51,
    city: "Mumbai",
    pincode: "400050",
    image: "/images/remakers/priya-shah.jpg",
    rating: 4.9,
    totalReviews: 102,
    followers: 1570,
    productsCount: 23,
    yearsOfExperience: 8,
    sellerType: "remaker",
    verified: true,
    portfolio: [
      {
        id: "priya-portfolio-1",
        title: "Recovered Textile Bag",
        image: "https://images.pexels.com/photos/3185223/pexels-photo-3185223.jpeg?auto=compress&cs=tinysrgb&w=1000",
        description: "A lifestyle bag made from recovered textile material.",
      },
      {
        id: "priya-portfolio-2",
        title: "Patchwork Jacket",
        image: "https://images.pexels.com/photos/7679725/pexels-photo-7679725.jpeg?auto=compress&cs=tinysrgb&w=1000",
        description: "A unique jacket created from leftover textile pieces.",
      },
      {
        id: "priya-portfolio-3",
        title: "Textile Home Collection",
        image: "https://images.pexels.com/photos/8266834/pexels-photo-8266834.jpeg?auto=compress&cs=tinysrgb&w=1000",
        description:
          "A collection of home accessories created from discarded fabrics.",
      },
    ],
  },
];

/* Filled from the server by setLiveItems (below). No sample listings. */
export const ITEMS = [];

export const REVIEWS = {
  "user-meera-iyer": [
    {
      id: "review-1",
      name: "Rahul",
      rating: 5,
      text: "The product was exactly as described and packed very carefully.",
      date: "2026-08-18",
    },
    {
      id: "review-2",
      name: "Sneha",
      rating: 4,
      text: "Smooth communication and quick response.",
      date: "2026-07-26",
    },
  ],

  "user-rohan-shah": [
    {
      id: "review-3",
      name: "Karan",
      rating: 5,
      text: "Very good seller. The chair was in excellent condition.",
      date: "2026-08-11",
    },
  ],

  "user-aarav-patel": [
    { id: "review-11", name: "Pooja", rating: 5, text: "Lovely lamp, well packed and exactly as shown.", date: "2026-09-12" },
    { id: "review-12", name: "Harsh", rating: 5, text: "Quick replies and a smooth handover.", date: "2026-08-28" },
  ],

  "user-nisha-rao": [
    { id: "review-13", name: "Kavya", rating: 5, text: "The side table is sturdy and the finish is lovely.", date: "2026-09-06" },
    { id: "review-14", name: "Arnav", rating: 4, text: "Good seller, item matched the photos.", date: "2026-08-14" },
  ],

  "user-kabir-verma": [
    { id: "review-15", name: "Sana", rating: 5, text: "The refurbished lamp works perfectly. Great value.", date: "2026-09-01" },
    { id: "review-16", name: "Tejas", rating: 4, text: "Honest description and careful packing.", date: "2026-08-05" },
  ],

  "user-anaya-singh": [
    { id: "review-17", name: "Ritika", rating: 5, text: "The jacket is beautifully finished. Very creative reuse of fabric.", date: "2026-09-10" },
    { id: "review-18", name: "Dev", rating: 5, text: "Fast delivery and the quality is excellent.", date: "2026-08-22" },
  ],

  "tara-bose": [
    {
      id: "review-4",
      name: "Aditi",
      rating: 5,
      text: "Beautiful restoration work. You can really see the craftsmanship.",
      date: "2026-09-02",
    },
    {
      id: "review-5",
      name: "Vivek",
      rating: 5,
      text: "The restored furniture looks amazing and feels very solid.",
      date: "2026-08-21",
    },
    {
      id: "review-6",
      name: "Neha",
      rating: 4,
      text: "Great artist and very professional communication.",
      date: "2026-08-09",
    },
  ],

  "arjun-mehta": [
    {
      id: "review-7",
      name: "Dhruv",
      rating: 5,
      text: "Loved the minimalist design and quality of the work.",
      date: "2026-09-05",
    },
    {
      id: "review-8",
      name: "Riya",
      rating: 5,
      text: "The product looks even better in person.",
      date: "2026-08-30",
    },
  ],

  "priya-shah": [
    {
      id: "review-9",
      name: "Mansi",
      rating: 5,
      text: "Beautiful textile work and excellent finishing.",
      date: "2026-09-08",
    },
    {
      id: "review-10",
      name: "Ishita",
      rating: 5,
      text: "Very creative use of recovered materials.",
      date: "2026-08-17",
    },
  ],
};

export const IMPACT = {
  itemsRescued: 1284,
  co2SavedTonnes: 47.6,
  remakersOnboarded: 36,
  pincodesServed: 25,
};

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

export function getUserById(id) {
  return USERS.find((user) => user.id === id);
}

export function getRemakerById(id) {
  return REMAKERS.find((remaker) => remaker.id === id);
}

export function getSellerById(id, sellerType) {
  if (sellerType === SELLER_TYPES.REMAKER) {
    return getRemakerById(id);
  }

  return getUserById(id);
}

export function getSellerFromItem(item) {
  if (!item) {
    return null;
  }

  return getSellerById(item.sellerId, item.sellerType);
}

/* Reviews buyers post from their orders (UI only, kept in memory). */
const postedReviews = {};

export function addSellerReview(sellerId, review) {
  postedReviews[sellerId] = [review, ...(postedReviews[sellerId] || []).filter((r) => r.id !== review.id)];
}

export function getSellerReviews(sellerId) {
  return [...(postedReviews[sellerId] || []), ...(REVIEWS[sellerId] || [])];
}

export function getProductsBySeller(sellerId) {
  return ITEMS.filter((item) => item.sellerId === sellerId);
}

export function getProductsByCategory(category) {
  return ITEMS.filter((item) => item.category === category);
}

export function getCategoryCount(category) {
  return ITEMS.filter((item) => item.category === category).length;
}

export function getRemakerProducts(remakerId) {
  return ITEMS.filter(
    (item) =>
      item.sellerType === SELLER_TYPES.REMAKER && item.sellerId === remakerId,
  );
}

/* ---------- live listings from the server (/api/marketplace/) ----------
   The marketplace screens, cart and wishlist all read ITEMS, so live rows are
   swapped into that same array in place (marked live: true). */
export function setLiveItems(cards) {
  for (let i = ITEMS.length - 1; i >= 0; i -= 1) if (ITEMS[i].live) ITEMS.splice(i, 1);
  ITEMS.unshift(
    ...cards.map((c) => ({
      id: c.id,
      live: true,
      title: c.title,
      category: c.category.name,
      price: Number(c.price) || 0,
      image: c.cover || "",
      summary: c.summary || "",
      description: c.summary || "",
      city: c.city || "Gujarat",
      pincode: "",
      co2SavedKg: 0,
      sellerRating: 0,
      condition: c.condition || (c.seller.type === "user" ? "Good" : "New"),
      seller: c.seller.name,
      sellerId: "",
      sellerType: c.seller.type,
      sellerImage: "",
      quantity: c.stock,
      soldOut: c.sold_out,
      views: 0,
      likes: 0,
      listedDate: c.created_at,
    })),
  );
}
