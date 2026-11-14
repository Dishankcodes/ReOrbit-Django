/* =========================================================
   User › Help & support (UI only, in-memory).
   FAQ + support tickets: Open -> In progress -> Resolved.
   ========================================================= */

import { useMemo } from "react";
import { useCommerce } from "../../shared/commerce";
import { usePublishedFaqs } from "../../shared/content";
import {
  createSupportTicket,
  replyToSupportTicket,
  setSupportTicketStatus,
  useSupportTicket,
  useSupportTickets,
} from "../../shared/supportTickets";

export const HELP_CATEGORIES = [
  {
    id: "account",
    label: "Account & profile",
    icon: "user",
    text: "Login, profile, addresses and security",
  },
  {
    id: "marketplace",
    label: "Buying",
    icon: "store",
    text: "Cart, checkout, payments and coupons",
  },
  {
    id: "orders",
    label: "Orders & delivery",
    icon: "package",
    text: "Tracking, cancellations, returns and refunds",
  },
  {
    id: "selling",
    label: "Selling",
    icon: "tag",
    text: "Listing items and payouts",
  },
  {
    id: "donations",
    label: "Donations",
    icon: "gift",
    text: "Pickups, certificates and what we accept",
  },
  {
    id: "rewards",
    label: "Orbit Points",
    icon: "star",
    text: "Earning points, vouchers and badges",
  },
];

export const FAQS = [
  {
    cat: "account",
    q: "How do I change my phone number or address?",
    a: "Open Settings, then Profile for your details and Addresses for delivery and pickup addresses. Changes save instantly.",
  },
  {
    cat: "account",
    q: "How do I reset my password?",
    a: "Go to Settings, then Security, and choose Change password. If you're locked out, use Forgot password on the login screen and we'll send a one-time code.",
  },
  {
    cat: "account",
    q: "Can I delete my account?",
    a: "Yes. Settings, then Account, then Delete account. Open orders must be completed first, and the deletion can't be undone.",
  },
  {
    cat: "marketplace",
    q: "How do I place an order?",
    a: "Open a product and choose Buy now to check out straight away, or Add to cart to keep shopping. At checkout pick an address, a payment method and review your order.",
  },
  {
    cat: "marketplace",
    q: "Which payment methods can I use?",
    a: "UPI, cards, net banking, the ReOrbit Wallet and pay on delivery (up to the limit shown at checkout).",
  },
  {
    cat: "marketplace",
    q: "How do coupons and vouchers work?",
    a: "Enter a code in the coupon box at checkout. Vouchers you redeem with Orbit Points appear under Orbit Points, then My vouchers, and work the same way.",
  },
  {
    cat: "orders",
    q: "How can I track my order?",
    a: "Open My orders, pick the order and choose Track order. You'll see each step from seller confirmation to delivery.",
  },
  {
    cat: "orders",
    q: "Can I cancel an order?",
    a: "You can cancel for free until the seller ships it. Open the order and choose Cancel. Your refund goes to the original payment method in 5 to 7 working days.",
  },
  {
    cat: "orders",
    q: "What if my item arrives damaged?",
    a: "Raise a ticket from Contact support within 48 hours of delivery with photos. We'll arrange a replacement or refund.",
  },
  {
    cat: "selling",
    q: "How do I sell an item?",
    a: "Go to Sell an item, add clear photos, the condition and a price. It goes live on the marketplace as soon as you publish it.",
  },
  {
    cat: "selling",
    q: "What fees do sellers pay?",
    a: "Nothing. You keep the full price you set. The buyer pays the platform fee and delivery on top, and ReOrbit-managed pickup is free for you.",
  },
  {
    cat: "selling",
    q: "When do I get paid?",
    a: "Your payout is released after the buyer receives the item. You can follow it on the Sales page.",
  },
  {
    cat: "donations",
    q: "Is donation pickup really free?",
    a: "Yes. Pickup is always free within our serviceable pincodes. You choose a day and a time slot.",
  },
  {
    cat: "donations",
    q: "What can I donate?",
    a: "Clean, usable furniture, clothes, books, working electronics, kitchenware, decor and toys. We can't take broken, unsafe or soiled items.",
  },
  {
    cat: "donations",
    q: "How do I get my certificate?",
    a: "Once your donation is delivered to an NGO and marked Completed, the certificate appears on the donation page and you earn Orbit Points.",
  },
  {
    cat: "rewards",
    q: "How do I earn Orbit Points?",
    a: "Buy items, donate, list items for sale, write reviews and follow ReMakers. See Orbit Points, then Ways to earn, for the exact rules.",
  },
  {
    cat: "rewards",
    q: "Do Orbit Points expire?",
    a: "No. Your points stay on your account. Vouchers you redeem have their own expiry date.",
  },
  {
    cat: "rewards",
    q: "How do badges work?",
    a: "Badges unlock automatically when you reach a milestone, like your first delivered order. Open a badge to see what's left.",
  },
];

export const TICKET_CATEGORIES = [
  "Order or delivery",
  "Payment or refund",
  "Selling or payouts",
  "Donation pickup",
  "Account or login",
  "Orbit Points",
  "Other",
];

/* Static answers + the FAQs published in Admin > Content. The admin versions win
   when the question is the same. Money figures come from Settings. */
const TOPIC_TO_CAT = {
  Buying: "marketplace",
  Selling: "selling",
  Donating: "donations",
  ReMakers: "marketplace",
  "Payments & refunds": "orders",
  Account: "account",
};
export function useHelpFaqs() {
  const commerce = useCommerce();
  const published = usePublishedFaqs();
  return useMemo(() => {
    const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
    const fixed = FAQS.map((f) =>
      f.q === "Which payment methods can I use?"
        ? {
            ...f,
            a: `UPI, cards, net banking, the ReOrbit Wallet and pay on delivery${commerce.codEnabled ? ` (for orders up to ${inr(commerce.codLimit)})` : " (switched off right now)"}.`,
          }
        : f.q === "What fees do sellers pay?"
          ? {
              ...f,
              a: `Nothing. You keep the full price you set. The buyer pays a ${commerce.platformFeePct}% platform fee and delivery on top, and ReOrbit-managed pickup is free for you.`,
            }
          : f,
    );
    const fromAdmin = published.map((f) => ({
      cat: TOPIC_TO_CAT[f.topic] || "account",
      q: f.q,
      a: f.a,
    }));
    const seen = new Set(fromAdmin.map((f) => f.q.trim().toLowerCase()));
    return [
      ...fromAdmin,
      ...fixed.filter((f) => !seen.has(f.q.trim().toLowerCase())),
    ];
  }, [commerce, published]);
}

export async function createTicket(payload) {
  const ticket = await createSupportTicket("user", payload);
  return ticket.id;
}

export const replyToTicket = (id, text) =>
  replyToSupportTicket("user", id, text);
export const closeTicket = (id) =>
  setSupportTicketStatus("user", id, "Resolved");
export const useTickets = () => useSupportTickets("user");
export const useTicket = (id) => useSupportTicket("user", id);
