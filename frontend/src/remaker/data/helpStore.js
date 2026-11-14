/* ReMaker support tickets use the shared persistent support API/store. */
import {
  createSupportTicket,
  replyToSupportTicket,
  setSupportTicketStatus,
  useSupportTicket,
  useSupportTickets,
} from "../../shared/supportTickets";

export const SUPPORT = {
  email: "support@reorbit.in",
  phone: "1800 000 1234",
  hours: "Every day, 9 am to 7 pm",
  replyTime: "We usually reply within 24 hours",
};

export const FAQ_CATEGORIES = [
  { key: "start", label: "Getting started", note: "Set up your studio" },
  { key: "products", label: "Products", note: "Listings, photos, stock" },
  {
    key: "orders",
    label: "Orders and shipping",
    note: "Accept, pack, deliver",
  },
  { key: "money", label: "Earnings and payouts", note: "Fees and withdrawals" },
  { key: "account", label: "Account and safety", note: "Security and privacy" },
];

export const FAQS = [
  {
    id: "f1",
    category: "start",
    q: "How do I get my studio verified?",
    a: "Fill in your studio profile with a photo, your craft, your experience and any certifications. Our team checks it within 2 working days and adds the Verified ReMaker badge.",
  },
  {
    id: "f2",
    category: "start",
    q: "What is the difference between buying and selling on ReOrbit?",
    a: "You can do both. Buy reusable items from the community in the Marketplace to rework, then list your finished pieces under Products. Purchases and Sales are separate pages in your sidebar.",
  },
  {
    id: "f3",
    category: "start",
    q: "Can I change my studio name?",
    a: "Yes. Open Settings, then Account, and edit your studio name. It updates on your products and profile straight away.",
  },
  {
    id: "f4",
    category: "products",
    q: "How many photos should I add to a product?",
    a: "Add 3 or 4 clear photos in good light. The first photo is the cover buyers see in search, so make it your best one.",
  },
  {
    id: "f5",
    category: "products",
    q: "Can I delete a product?",
    a: "Products cannot be deleted, so your order history and reviews stay safe. Switch the product to Inactive and it disappears from the marketplace.",
  },
  {
    id: "f6",
    category: "products",
    q: "Why is my product still pending?",
    a: "New products pass a quick quality check. It normally takes a few hours. We will send a notification as soon as it is live.",
  },
  {
    id: "f7",
    category: "orders",
    q: "How long do I have to accept an order?",
    a: "You have 24 hours. Orders that are not accepted in time are cancelled and the customer is refunded, which can lower your seller rating.",
  },
  {
    id: "f8",
    category: "orders",
    q: "Who delivers my orders?",
    a: "When a customer chooses ReOrbit delivery, a rider collects the parcel from your address after you mark it packed. The customer pays the delivery fee. Customers can also collect from you in person.",
  },
  {
    id: "f9",
    category: "orders",
    q: "What if a customer says the item arrived damaged?",
    a: "They report it from their order and our team reviews the photos. Pack carefully and photograph the item before handing it over so you have proof of its condition.",
  },
  {
    id: "f10",
    category: "money",
    q: "How much does ReOrbit charge?",
    a: "Nothing comes out of your earnings. You keep the full item price. The buyer pays the platform fee and delivery on top of it.",
  },
  {
    id: "f11",
    category: "money",
    q: "When can I withdraw my money?",
    a: "Earnings clear 3 days after delivery. Once you have ₹500 or more available you can withdraw it from the Payouts page, and it reaches your bank in 1 to 2 working days.",
  },
  {
    id: "f12",
    category: "money",
    q: "Can I change my bank account?",
    a: "Yes. Go to Earnings, then Payouts, and choose Change next to your bank account. We keep only the last 4 digits of the account number.",
  },
  {
    id: "f16",
    category: "account",
    q: "How do I turn on two-step verification?",
    a: "Open Settings, then Account, and switch on Two-step verification. We will send a one-time code each time you sign in on a new device.",
  },
  {
    id: "f17",
    category: "account",
    q: "How do I report a customer or a review?",
    a: "Report a review from the Reviews page. For a customer or an order problem, create a support ticket and choose Report a person or order.",
  },
  {
    id: "f18",
    category: "account",
    q: "How do I close my account?",
    a: "Finish your open orders and withdraw your money first. Then open Settings, then Close account, to deactivate or delete your studio.",
  },
];

export const TICKET_CATEGORIES = [
  "Orders and shipping",
  "Earnings and payouts",
  "Products and listings",
  "Account and security",
  "Report a person or order",
  "Something is not working",
  "Other",
];

export const STATUS_TONE = {
  Open: "open",
  "In progress": "progress",
  "Waiting for you": "waiting",
  Resolved: "resolved",
  Closed: "closed",
};

export const useTickets = () => useSupportTickets("remaker");
export const useTicket = (id) => useSupportTicket("remaker", id);

export async function createTicket({
  subject,
  category,
  priority,
  relatedOrder,
  description,
}) {
  return createSupportTicket("remaker", {
    subject,
    category,
    priority,
    relatedOrder,
    description,
  });
}

export const replyToTicket = (id, text) =>
  replyToSupportTicket("remaker", id, text);
export const setTicketStatus = (id, status) =>
  setSupportTicketStatus("remaker", id, status);

export function dateLabel(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function timeLabel(iso) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}
