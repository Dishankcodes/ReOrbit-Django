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
    q: "How do I make my studio stand out?",
    a: "Fill in your studio profile with a photo, a cover, your craft, your experience and any certifications. Add portfolio pieces and good photos to every product. Complete studios get more views and followers.",
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
    a: "Yes. Edit your studio name on your studio profile, and your studio handle under Settings, then Account. Both update on your products and profile straight away.",
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
    q: "When does my product go live?",
    a: "As soon as you publish it. A product saved as a draft stays hidden until you publish. The ReOrbit team can switch off a product that breaks the rules, and you will get a notification with the reason.",
  },
  {
    id: "f7",
    category: "orders",
    q: "What do I do when an order comes in?",
    a: "Paid orders arrive confirmed, so there is nothing to accept. Pack the item, mark it packed, then either ship it yourself with a tracking number or ask for a ReOrbit pickup. Ship quickly: slow orders get cancelled and refunded, which can hurt your rating.",
  },
  {
    id: "f8",
    category: "orders",
    q: "Who delivers my orders?",
    a: "You choose for each order. Ship it yourself with any courier and add the tracking number, or pick Managed by ReOrbit: pack it, ask for a pickup, and ReOrbit's pickup team collects it from your address and delivers it.",
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
    a: "Earnings are held after delivery for the return window, then clear to your wallet. Once you have at least the smallest payout amount you can withdraw from the Payouts page. Settings, then Payouts, shows the current hold days and minimum.",
  },
  {
    id: "f12",
    category: "money",
    q: "Can I change my bank account?",
    a: "Yes. Open Settings, then Payouts, and choose Change account. Your full account number is stored encrypted and only the last digits are shown.",
  },
  {
    id: "f16",
    category: "account",
    q: "How do I keep my account safe?",
    a: "ReMakers sign in with a one-time code sent to their email (or with Google), so there is no password to steal. Keep your email account secure, and turn on sign-in alerts under Settings, then Sign-in and security, to get an email whenever someone signs in.",
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
    a: "Finish your open orders and returns and withdraw your money first. Then open Settings, then Delete account. Your studio is hidden straight away, and you have 30 days to change your mind by signing in again.",
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
  photos,
}) {
  return createSupportTicket("remaker", {
    subject,
    category,
    priority,
    relatedOrder,
    description,
    photos,
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
