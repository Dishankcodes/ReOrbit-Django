import {
  CATEGORIES,
  CONDITIONS,
  IMPACT,
  ITEMS,
  REMAKERS,
  REVIEWS,
  USERS,
  formatPrice as formatMarketplacePrice,
  getItemById,
  getRemakerById,
  getProductsBySeller,
  getSellerReviews,
} from "../../data/marketplaceData";

export { CATEGORIES, CONDITIONS, IMPACT, ITEMS, REMAKERS, REVIEWS, USERS };
export { getItemById, getRemakerById, getProductsBySeller, getSellerReviews };

export const currentUser = {
  id: "user-aarav-patel",
  name: "Aarav Patel",
  firstName: "Aarav",
  username: "aarav_patel",
  email: "aarav.patel@example.com",
  city: "Ahmedabad",
  pincode: "380015",
  avatar: "/images/users/aarav-patel.jpg",
  points: 1840,
  level: "Impact Maker",
  itemsRescued: 18,
  orders: 7,
  wishlist: 12,
  following: 8,
  co2Saved: 26.4,
};

export const products = ITEMS.map((item) => ({
  ...item,
  rating: item.sellerRating,
  co2: item.co2SavedKg,
  location: item.city,
}));

export const remakers = REMAKERS.map((remaker) => ({
  ...remaker,
  rescued: remaker.itemsRescued,
  products: remaker.productsCount,
}));

export const orders = [
  {
    id: "RO-10482",
    productId: "teak-drawer-chest",
    product: "Teak drawer chest, 1970s",
    seller: "Meera Iyer",
    image: "/images/products/teak-drawer-chest.jpg",
    amount: 4200,
    status: "Delivered",
    date: "28 Sep 2026",
    delivery: "Delivered on 02 Oct",
  },
  {
    id: "RO-10377",
    productId: "ceramic-table-lamp",
    product: "Handmade ceramic table lamp",
    seller: "Aarav Patel",
    image: "/images/products/ceramic-lamp.jpg",
    amount: 1650,
    status: "In transit",
    date: "04 Oct 2026",
    delivery: "Expected 10 Oct",
  },
  {
    id: "RO-10291",
    productId: "vintage-reading-chair",
    product: "Vintage reading chair",
    seller: "Rohan Shah",
    image: "/images/products/vintage-chair.jpg",
    amount: 2800,
    status: "Processing",
    date: "06 Oct 2026",
    delivery: "Preparing for dispatch",
  },
];

export const wishlist = ITEMS.slice(0, 5).map((item) => ({
  ...item,
  rating: item.sellerRating,
  co2: item.co2SavedKg,
  location: item.city,
}));

export const notifications = [
  {
    id: 1,
    title: "Order on the move",
    text: "Your ceramic lamp is now in transit.",
    time: "18 min ago",
    unread: true,
    icon: "package",
  },
  {
    id: 2,
    title: "Orbit Points earned",
    text: "You earned 120 points from your latest order.",
    time: "2 hrs ago",
    unread: true,
    icon: "star",
  },
  {
    id: 3,
    title: "Wishlist reminder",
    text: "The restored teak chest is still available.",
    time: "Yesterday",
    unread: false,
    icon: "heart",
  },
];

export const activities = [
  {
    icon: "shopping-bag",
    title: "Purchased Handmade ceramic table lamp",
    time: "2 days ago",
    meta: "+120 points",
  },
  {
    icon: "heart",
    title: "Saved Vintage reading chair to wishlist",
    time: "4 days ago",
    meta: "Wishlist",
  },
  {
    icon: "user-plus",
    title: "Started following Priya Shah",
    time: "1 week ago",
    meta: "Following",
  },
  {
    icon: "gift",
    title: "Donated a cotton study chair",
    time: "2 weeks ago",
    meta: "+250 impact points",
  },
];

export const badges = [
  {
    icon: "leaf",
    title: "First Orbit",
    text: "Completed your first sustainable purchase.",
    earned: true,
    date: "12 Aug 2026",
  },
  {
    icon: "shopping-bag",
    title: "Circular Shopper",
    text: "Completed 5 marketplace purchases.",
    earned: true,
    date: "22 Sep 2026",
  },
  {
    icon: "heart",
    title: "Thoughtful Collector",
    text: "Saved 10 products to your wishlist.",
    earned: true,
    date: "30 Sep 2026",
  },
  {
    icon: "gift",
    title: "Community Giver",
    text: "Complete 3 donations to unlock this badge.",
    earned: false,
  },
  {
    icon: "recycle",
    title: "Second Life",
    text: "Help rescue 25 items from waste.",
    earned: false,
  },
  {
    icon: "trophy",
    title: "Impact Champion",
    text: "Reach 5,000 Orbit Points.",
    earned: false,
  },
];

export const faqs = [
  [
    "How do I place an order?",
    "Open any product, review its details, and select Add to cart or Buy now. Your order will appear under My Orders once confirmed.",
  ],
  [
    "How do Orbit Points work?",
    "Orbit Points reward sustainable activity such as purchases, donations, reviews and community actions. Points can unlock badges and future rewards.",
  ],
  [
    "Can I return a product?",
    "Return eligibility depends on the product and seller. Open the order details to view the return policy attached to that purchase.",
  ],
  [
    "How can I follow a ReMaker?",
    "Open a ReMaker profile from the marketplace or Discover page and select Follow ReMaker. Their new work will then appear in Following.",
  ],
];

export const formatPrice = formatMarketplacePrice;

export function getOrderById(id) {
  return orders.find((order) => order.id === id);
}
