export const CATEGORIES = [
  "Furniture",
  "Electronics",
  "Home & Living",
  "Clothing",
  "Books",
  "Decor",
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
        image: "/images/portfolio/tara-teak-cabinet.jpg",
        description:
          "A rescued teak cabinet restored while preserving its original character.",
      },
      {
        id: "tara-portfolio-2",
        title: "Vintage Chair Restoration",
        image: "/images/portfolio/tara-chair.jpg",
        description:
          "A damaged vintage chair transformed into a functional statement piece.",
      },
      {
        id: "tara-portfolio-3",
        title: "Reclaimed Wood Console",
        image: "/images/portfolio/tara-console.jpg",
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
        image: "/images/portfolio/arjun-shelf.jpg",
        description: "A minimal wall shelf made from recovered wood.",
      },
      {
        id: "arjun-portfolio-2",
        title: "Upcycled Lamp",
        image: "/images/portfolio/arjun-lamp.jpg",
        description:
          "An old industrial component transformed into a modern lamp.",
      },
      {
        id: "arjun-portfolio-3",
        title: "Recycled Metal Decor",
        image: "/images/portfolio/arjun-metal.jpg",
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
        image: "/images/portfolio/priya-bag.jpg",
        description: "A lifestyle bag made from recovered textile material.",
      },
      {
        id: "priya-portfolio-2",
        title: "Patchwork Jacket",
        image: "/images/portfolio/priya-jacket.jpg",
        description: "A unique jacket created from leftover textile pieces.",
      },
      {
        id: "priya-portfolio-3",
        title: "Textile Home Collection",
        image: "/images/portfolio/priya-home.jpg",
        description:
          "A collection of home accessories created from discarded fabrics.",
      },
    ],
  },
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
    description:
      "A beautiful vintage teak drawer chest from the 1970s. The original brass pulls have been retained and the structure remains strong. The top panel has natural sun fading that adds character.",
    city: "Bengaluru",
    pincode: "560034",
    co2SavedKg: 62,
    sellerRating: 4.8,
    condition: "Good",
    seller: "Meera Iyer",
    sellerId: "user-meera-iyer",
    sellerType: "user",
    sellerImage: "/images/users/meera-iyer.jpg",
    quantity: 1,
    views: 184,
    likes: 32,
    listedDate: "2026-09-10",
  },
  {
    id: "vintage-reading-chair",
    title: "Vintage reading chair",
    category: "Furniture",
    price: 2800,
    image: "/images/products/vintage-chair.jpg",
    summary:
      "A classic wooden reading chair with a restored frame and freshly finished seat.",
    description:
      "A classic wooden reading chair restored for everyday use. The wooden frame has been cleaned and strengthened, while the seat has received a fresh finish.",
    city: "Pune",
    pincode: "411007",
    co2SavedKg: 38,
    sellerRating: 4.7,
    condition: "Very Good",
    seller: "Rohan Shah",
    sellerId: "user-rohan-shah",
    sellerType: "user",
    sellerImage: "/images/users/rohan-shah.jpg",
    quantity: 1,
    views: 143,
    likes: 25,
    listedDate: "2026-09-14",
  },
  {
    id: "ceramic-table-lamp",
    title: "Handmade ceramic table lamp",
    category: "Home & Living",
    price: 1650,
    image: "/images/products/ceramic-lamp.jpg",
    summary:
      "Warm ceramic table lamp with a handmade textured base and carefully restored wiring.",
    description:
      "A handmade ceramic lamp with a textured body and warm ambient lighting. The electrical components have been carefully checked and restored.",
    city: "Ahmedabad",
    pincode: "380015",
    co2SavedKg: 12,
    sellerRating: 4.9,
    condition: "Excellent",
    seller: "Aarav Patel",
    sellerId: "user-aarav-patel",
    sellerType: "user",
    sellerImage: "/images/users/aarav-patel.jpg",
    quantity: 2,
    views: 212,
    likes: 47,
    listedDate: "2026-09-18",
  },
  {
    id: "solid-wood-side-table",
    title: "Solid wood side table",
    category: "Furniture",
    price: 2200,
    image: "/images/products/wooden-table.jpg",
    summary:
      "Compact solid-wood side table with natural grain, restored legs, and a smooth finish.",
    description:
      "A compact solid-wood side table with beautiful natural grain. The legs have been restored and the entire surface has been refinished.",
    city: "Mumbai",
    pincode: "400050",
    co2SavedKg: 31,
    sellerRating: 4.6,
    condition: "Good",
    seller: "Nisha Rao",
    sellerId: "user-nisha-rao",
    sellerType: "user",
    sellerImage: "/images/users/nisha-rao.jpg",
    quantity: 1,
    views: 119,
    likes: 21,
    listedDate: "2026-09-08",
  },
  {
    id: "refurbished-desk-lamp",
    title: "Refurbished desk lamp",
    category: "Electronics",
    price: 950,
    image: "/images/products/default-item.jpg",
    summary:
      "Compact desk lamp cleaned, tested, and refurbished for everyday workspace use.",
    description:
      "A compact desk lamp that has been cleaned, tested and refurbished for everyday workspace use.",
    city: "Delhi",
    pincode: "110016",
    co2SavedKg: 8,
    sellerRating: 4.7,
    condition: "Very Good",
    seller: "Kabir Verma",
    sellerId: "user-kabir-verma",
    sellerType: "user",
    sellerImage: "/images/users/kabir-verma.jpg",
    quantity: 3,
    views: 98,
    likes: 17,
    listedDate: "2026-09-20",
  },
  {
    id: "cotton-handloom-jacket",
    title: "Upcycled cotton jacket",
    category: "Clothing",
    price: 1450,
    image: "/images/products/default-item.jpg",
    summary:
      "A comfortable cotton jacket created using recovered textile material and careful stitching.",
    description:
      "A comfortable jacket made from recovered cotton textile material. The fabric has been carefully cleaned and stitched into a durable everyday garment.",
    city: "Jaipur",
    pincode: "302017",
    co2SavedKg: 6,
    sellerRating: 4.9,
    condition: "Excellent",
    seller: "Anaya Singh",
    sellerId: "user-anaya-singh",
    sellerType: "user",
    sellerImage: "/images/users/anaya-singh.jpg",
    quantity: 1,
    views: 157,
    likes: 38,
    listedDate: "2026-09-19",
  },
  {
    id: "classic-novel-collection",
    title: "Classic novel collection",
    category: "Books",
    price: 750,
    image: "/images/products/default-item.jpg",
    summary:
      "A curated collection of classic novels looking for a new bookshelf and reader.",
    description:
      "A curated collection of classic novels in good readable condition, looking for a new bookshelf and reader.",
    city: "Kolkata",
    pincode: "700029",
    co2SavedKg: 5,
    sellerRating: 4.8,
    condition: "Good",
    seller: "Tara Bose",
    sellerId: "tara-bose",
    sellerType: "remaker",
    sellerImage: "/images/remakers/tara-bose.jpg",
    quantity: 1,
    views: 134,
    likes: 29,
    listedDate: "2026-09-16",
  },
  {
    id: "reclaimed-wall-decor",
    title: "Reclaimed wood wall decor",
    category: "Decor",
    price: 1250,
    image: "/images/products/default-item.jpg",
    summary:
      "Decorative wall piece made from reclaimed wood with a natural finish and minimal design.",
    description:
      "A decorative wall piece created from reclaimed wood. It features a natural finish and minimal design that works well with modern interiors.",
    city: "Surat",
    pincode: "395007",
    co2SavedKg: 14,
    sellerRating: 4.8,
    condition: "Excellent",
    seller: "Priya Shah",
    sellerId: "priya-shah",
    sellerType: "remaker",
    sellerImage: "/images/remakers/priya-shah.jpg",
    quantity: 2,
    views: 176,
    likes: 41,
    listedDate: "2026-09-21",
  },
  {
    id: "restored-teak-cabinet",
    title: "Restored teak cabinet",
    category: "Furniture",
    price: 6800,
    image: "/images/products/default-item.jpg",
    summary:
      "Vintage teak cabinet carefully restored while preserving its original character.",
    description:
      "A vintage teak cabinet restored by Tara Bose. Original details have been preserved while the structure has been strengthened for everyday use.",
    city: "Kolkata",
    pincode: "700029",
    co2SavedKg: 78,
    sellerRating: 4.9,
    condition: "Excellent",
    seller: "Tara Bose",
    sellerId: "tara-bose",
    sellerType: "remaker",
    sellerImage: "/images/remakers/tara-bose.jpg",
    quantity: 1,
    views: 267,
    likes: 62,
    listedDate: "2026-09-12",
  },
  {
    id: "reclaimed-wood-shelf",
    title: "Reclaimed wood wall shelf",
    category: "Decor",
    price: 1850,
    image: "/images/products/default-item.jpg",
    summary:
      "Minimal wall shelf made from recovered wood with a natural handcrafted finish.",
    description:
      "A minimal wall shelf handcrafted from recovered wood. The natural grain has been retained for a warm, organic appearance.",
    city: "Ahmedabad",
    pincode: "380015",
    co2SavedKg: 22,
    sellerRating: 4.8,
    condition: "Excellent",
    seller: "Arjun Mehta",
    sellerId: "arjun-mehta",
    sellerType: "remaker",
    sellerImage: "/images/remakers/arjun-mehta.jpg",
    quantity: 4,
    views: 198,
    likes: 45,
    listedDate: "2026-09-15",
  },
  {
    id: "upcycled-home-lamp",
    title: "Upcycled industrial lamp",
    category: "Home & Living",
    price: 2450,
    image: "/images/products/default-item.jpg",
    summary:
      "Industrial-style lamp created by transforming recovered materials into a functional light.",
    description:
      "An industrial-inspired table lamp created from recovered materials and finished by hand.",
    city: "Ahmedabad",
    pincode: "380015",
    co2SavedKg: 18,
    sellerRating: 4.8,
    condition: "Very Good",
    seller: "Arjun Mehta",
    sellerId: "arjun-mehta",
    sellerType: "remaker",
    sellerImage: "/images/remakers/arjun-mehta.jpg",
    quantity: 2,
    views: 224,
    likes: 51,
    listedDate: "2026-09-22",
  },
  {
    id: "recovered-textile-bag",
    title: "Recovered textile lifestyle bag",
    category: "Clothing",
    price: 1200,
    image: "/images/products/default-item.jpg",
    summary: "Durable lifestyle bag created from recovered textile material.",
    description:
      "A practical lifestyle bag created using recovered textiles. Each piece has its own unique material pattern.",
    city: "Mumbai",
    pincode: "400050",
    co2SavedKg: 9,
    sellerRating: 4.9,
    condition: "Excellent",
    seller: "Priya Shah",
    sellerId: "priya-shah",
    sellerType: "remaker",
    sellerImage: "/images/remakers/priya-shah.jpg",
    quantity: 5,
    views: 241,
    likes: 67,
    listedDate: "2026-09-23",
  },
];

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

export function getSellerReviews(sellerId) {
  return REVIEWS[sellerId] || [];
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
