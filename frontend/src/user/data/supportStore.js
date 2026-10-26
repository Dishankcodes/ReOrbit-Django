/* =========================================================
   User › Help & support (UI only, in-memory).
   FAQ + support tickets: Open -> In progress -> Resolved.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";

const DAY = 86400000;
const ago = (d, h = 0) => new Date(Date.now() - d * DAY - h * 3600000).toISOString();

export const HELP_CATEGORIES = [
  { id: "account", label: "Account & profile", icon: "user", text: "Login, profile, addresses and security" },
  { id: "marketplace", label: "Buying", icon: "store", text: "Cart, checkout, payments and coupons" },
  { id: "orders", label: "Orders & delivery", icon: "package", text: "Tracking, cancellations, returns and refunds" },
  { id: "selling", label: "Selling", icon: "tag", text: "Listing items, verification and payouts" },
  { id: "donations", label: "Donations", icon: "gift", text: "Pickups, certificates and what we accept" },
  { id: "rewards", label: "Orbit Points", icon: "star", text: "Earning points, vouchers and badges" },
];

export const FAQS = [
  { cat: "account", q: "How do I change my phone number or address?", a: "Open Settings, then Profile for your details and Addresses for delivery and pickup addresses. Changes save instantly." },
  { cat: "account", q: "How do I reset my password?", a: "Go to Settings, then Security, and choose Change password. If you're locked out, use Forgot password on the login screen and we'll send a one-time code." },
  { cat: "account", q: "Can I delete my account?", a: "Yes. Settings, then Account, then Delete account. Open orders must be completed first, and the deletion can't be undone." },
  { cat: "marketplace", q: "How do I place an order?", a: "Open a product and choose Buy now to check out straight away, or Add to cart to keep shopping. At checkout pick an address, a payment method and review your order." },
  { cat: "marketplace", q: "Which payment methods can I use?", a: "UPI, cards, net banking, the ReOrbit Wallet and pay on delivery (for orders up to ₹10,000)." },
  { cat: "marketplace", q: "How do coupons and vouchers work?", a: "Enter a code in the coupon box at checkout. Vouchers you redeem with Orbit Points appear under Orbit Points, then My vouchers, and work the same way." },
  { cat: "orders", q: "How can I track my order?", a: "Open My orders, pick the order and choose Track order. You'll see each step from seller confirmation to delivery." },
  { cat: "orders", q: "Can I cancel an order?", a: "You can cancel for free until the seller ships it. Open the order and choose Cancel. Your refund goes to the original payment method in 5 to 7 working days." },
  { cat: "orders", q: "What if my item arrives damaged?", a: "Raise a ticket from Contact support within 48 hours of delivery with photos. We'll arrange a replacement or refund." },
  { cat: "selling", q: "How do I sell an item?", a: "Go to Sell an item, add clear photos, the condition and a price. Our team verifies it, usually within 24 hours, and then it goes live on the marketplace." },
  { cat: "selling", q: "What fees do sellers pay?", a: "ReOrbit keeps an 8% commission on each sale. If you choose platform-managed pickup there is also a ₹99 service fee. Both are shown before you submit." },
  { cat: "selling", q: "When do I get paid?", a: "Your payout is released after the buyer receives the item. You can follow it on the Sales page." },
  { cat: "donations", q: "Is donation pickup really free?", a: "Yes. Pickup is always free within our serviceable pincodes. You choose a day and a time slot." },
  { cat: "donations", q: "What can I donate?", a: "Clean, usable furniture, clothes, books, working electronics, kitchenware, decor and toys. We can't take broken, unsafe or soiled items." },
  { cat: "donations", q: "How do I get my certificate?", a: "Once your donation is delivered to an NGO and marked Completed, the certificate appears on the donation page and you earn Orbit Points." },
  { cat: "rewards", q: "How do I earn Orbit Points?", a: "Buy items, donate, list items for sale, write reviews and follow ReMakers. See Orbit Points, then Ways to earn, for the exact rules." },
  { cat: "rewards", q: "Do Orbit Points expire?", a: "No. Your points stay on your account. Vouchers you redeem have their own expiry date." },
  { cat: "rewards", q: "How do badges work?", a: "Badges unlock automatically when you reach a milestone, like your first delivered order. Open a badge to see what's left." },
];

export const TICKET_CATEGORIES = ["Order or delivery", "Payment or refund", "Selling or payouts", "Donation pickup", "Account or login", "Orbit Points", "Other"];

const msg = (from, text, at) => ({ id: `${from}-${at}`, from, text, at });

const seedTickets = () => [
  {
    id: "TKT-4802", subject: "Parcel marked delivered but not received", category: "Order or delivery", orderId: "RO-10388",
    status: "In progress", priority: "High", createdAt: ago(2), updatedAt: ago(0, 5),
    messages: [
      msg("user", "My order RO-10388 says delivered, but I haven't received anything. Please check with the courier.", ago(2)),
      msg("team", "Sorry about that, Aarav. We've raised this with the courier and asked for the delivery proof. We'll update you within 24 hours.", ago(1, 20)),
      msg("team", "The courier confirmed the parcel was left with the building security. Could you please check with them and let us know?", ago(0, 5)),
    ],
  },
  {
    id: "TKT-4711", subject: "How do I get my donation certificate?", category: "Donation pickup", orderId: "",
    status: "Resolved", priority: "Normal", createdAt: ago(21), updatedAt: ago(20),
    messages: [
      msg("user", "My donation DON-2041 was completed but I can't find the certificate.", ago(21)),
      msg("team", "You can open it from the donation page. We've also emailed it to you. Glad to help!", ago(20, 2)),
    ],
  },
];

let tickets = seedTickets();
let seq = 4820;
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => tickets;
const commit = (next) => { tickets = next; listeners.forEach((l) => l()); };

export function createTicket({ subject, category, message, orderId }) {
  seq += 1;
  const id = `TKT-${seq}`;
  const at = new Date().toISOString();
  commit([
    {
      id, subject: subject.trim(), category, orderId: orderId || "", status: "Open", priority: category === "Payment or refund" ? "High" : "Normal",
      createdAt: at, updatedAt: at,
      messages: [
        msg("user", message.trim(), at),
        msg("team", "Thanks for reaching out. We've received your request and a support specialist will reply within 24 hours.", at),
      ],
    },
    ...tickets,
  ]);
  return id;
}

export function replyToTicket(id, text) {
  const at = new Date().toISOString();
  commit(tickets.map((t) => (t.id === id ? { ...t, status: t.status === "Resolved" ? "Open" : t.status, updatedAt: at, messages: [...t.messages, msg("user", text.trim(), at)] } : t)));
}

export function closeTicket(id) {
  const at = new Date().toISOString();
  commit(tickets.map((t) => (t.id === id ? { ...t, status: "Resolved", updatedAt: at, messages: [...t.messages, msg("team", "Marked as resolved at your request. You can reopen it any time by replying.", at)] } : t)));
}

export function useTickets() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(() => [...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)), [list]);
}
export function useTicket(id) {
  const list = useTickets();
  return useMemo(() => list.find((t) => t.id === id) || null, [list, id]);
}
