/* =========================================================
   REMAKER HELP & SUPPORT - UI STORE (no backend yet)
   Help articles (FAQs) and the ReMaker's support tickets. A ticket
   follows the Reports idea from the schema (a reason, a description,
   a status) and adds a short conversation with ReOrbit support.

   Tickets are saved in localStorage. Replace the functions below with
   API calls later.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";

const KEY = "reorbit_remaker_tickets_v1";
const NOW = Date.now();
const ago = (hours) => new Date(NOW - hours * 3600000).toISOString();

export const SUPPORT = {
  email: "support@reorbit.in",
  phone: "1800 000 1234",
  hours: "Every day, 9 am to 7 pm",
  replyTime: "We usually reply within 24 hours",
};

export const FAQ_CATEGORIES = [
  { key: "start", label: "Getting started", note: "Set up your studio" },
  { key: "products", label: "Products", note: "Listings, photos, stock" },
  { key: "orders", label: "Orders and shipping", note: "Accept, pack, deliver" },
  { key: "money", label: "Earnings and payouts", note: "Fees and withdrawals" },
  { key: "jobs", label: "ReOrbit jobs", note: "Warehouse refurbishing work" },
  { key: "account", label: "Account and safety", note: "Security and privacy" },
];

export const FAQS = [
  { id: "f1", category: "start", q: "How do I get my studio verified?", a: "Fill in your studio profile with a photo, your craft, your experience and any certifications. Our team checks it within 2 working days and adds the Verified ReMaker badge." },
  { id: "f2", category: "start", q: "What is the difference between buying and selling on ReOrbit?", a: "You can do both. Buy reusable items from the community in the Marketplace to rework, then list your finished pieces under Products. Purchases and Sales are separate pages in your sidebar." },
  { id: "f3", category: "start", q: "Can I change my studio name?", a: "Yes. Open Settings, then Account, and edit your studio name. It updates on your products and profile straight away." },
  { id: "f4", category: "products", q: "How many photos should I add to a product?", a: "Add 3 or 4 clear photos in good light. The first photo is the cover buyers see in search, so make it your best one." },
  { id: "f5", category: "products", q: "Can I delete a product?", a: "Products cannot be deleted, so your order history and reviews stay safe. Switch the product to Inactive and it disappears from the marketplace." },
  { id: "f6", category: "products", q: "Why is my product still pending?", a: "New products pass a quick quality check. It normally takes a few hours. We will send a notification as soon as it is live." },
  { id: "f7", category: "orders", q: "How long do I have to accept an order?", a: "You have 24 hours. Orders that are not accepted in time are cancelled and the customer is refunded, which can lower your seller rating." },
  { id: "f8", category: "orders", q: "Who delivers my orders?", a: "When a customer chooses ReOrbit delivery, a rider collects the parcel from your address after you mark it packed. The customer pays the delivery fee. Customers can also collect from you in person." },
  { id: "f9", category: "orders", q: "What if a customer says the item arrived damaged?", a: "They report it from their order and our team reviews the photos. Pack carefully and photograph the item before handing it over so you have proof of its condition." },
  { id: "f10", category: "money", q: "How much does ReOrbit charge?", a: "ReOrbit keeps 8% of the item price. Delivery is paid by the customer and never comes out of your earnings." },
  { id: "f11", category: "money", q: "When can I withdraw my money?", a: "Earnings clear 3 days after delivery. Once you have ₹500 or more available you can withdraw it from the Payouts page, and it reaches your bank in 1 to 2 working days." },
  { id: "f12", category: "money", q: "Can I change my bank account?", a: "Yes. Go to Earnings, then Payouts, and choose Change next to your bank account. We keep only the last 4 digits of the account number." },
  { id: "f13", category: "jobs", q: "What are ReOrbit jobs?", a: "ReOrbit's warehouse receives donated and unsold items. Verified ReMakers can take on refurbishing jobs for a fixed fee. You rework the item, submit photos, and get paid after a quality check." },
  { id: "f14", category: "jobs", q: "What happens if my work fails the quality check?", a: "You get notes about what to fix and the job goes back to In progress. You can resubmit it as many times as you need before the deadline." },
  { id: "f15", category: "jobs", q: "Who provides the materials?", a: "Each job says what is included. Most jobs give you the item and basic finishing supplies. Extra materials are usually your own cost." },
  { id: "f16", category: "account", q: "How do I turn on two-step verification?", a: "Open Settings, then Account, and switch on Two-step verification. We will send a one-time code each time you sign in on a new device." },
  { id: "f17", category: "account", q: "How do I report a customer or a review?", a: "Report a review from the Reviews page. For a customer or an order problem, create a support ticket and choose Report a person or order." },
  { id: "f18", category: "account", q: "How do I close my account?", a: "Finish your open orders and withdraw your money first. Then open Settings, then Close account, to deactivate or delete your studio." },
];

export const TICKET_CATEGORIES = [
  "Orders and shipping",
  "Earnings and payouts",
  "Products and listings",
  "ReOrbit jobs",
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

function seed() {
  return [
    {
      id: "TK-4821",
      subject: "Payout PO-2203 shows the wrong amount",
      category: "Earnings and payouts",
      priority: "Normal",
      relatedOrder: "",
      status: "Waiting for you",
      createdAt: ago(52),
      updatedAt: ago(6),
      photos: [],
      messages: [
        { id: "m1", from: "me", name: "You", text: "The payout I received for PO-2203 is ₹15,364 but I expected a little more. Can you check the fee on SO-30933?", at: ago(52) },
        { id: "m2", from: "support", name: "Meena from ReOrbit Support", text: "Hi, thanks for flagging this. We have looked at both orders. Could you tell us the amount you expected for SO-30933 so we can compare?", at: ago(30) },
        { id: "m3", from: "support", name: "Meena from ReOrbit Support", text: "Just following up. A quick reply will let us finish the check.", at: ago(6) },
      ],
    },
    {
      id: "TK-4660",
      subject: "How do I list a product made from two ReOrbit items?",
      category: "Products and listings",
      priority: "Normal",
      relatedOrder: "",
      status: "Resolved",
      createdAt: ago(300),
      updatedAt: ago(280),
      photos: [],
      messages: [
        { id: "m4", from: "me", name: "You", text: "I combined a door and a window grille. Which item should I link on the product?", at: ago(300) },
        { id: "m5", from: "support", name: "Arjun from ReOrbit Support", text: "Link the main item that gave the piece its character, usually the biggest one. You can mention the second one in the product story. Hope that helps!", at: ago(282) },
        { id: "m6", from: "me", name: "You", text: "That works, thank you.", at: ago(281) },
      ],
    },
    {
      id: "TK-4402",
      subject: "Warehouse job photos will not upload",
      category: "Something is not working",
      priority: "Urgent",
      relatedOrder: "",
      status: "Closed",
      createdAt: ago(900),
      updatedAt: ago(870),
      photos: [],
      messages: [
        { id: "m7", from: "me", name: "You", text: "Uploading the after photo for my job keeps failing on my phone.", at: ago(900) },
        { id: "m8", from: "support", name: "Meena from ReOrbit Support", text: "Sorry about that. Photos over 8 MB fail on some phones. Try a smaller photo or lower the camera quality. We have also added a clearer message for next time.", at: ago(880) },
      ],
    },
  ];
}

/* ---------- store ---------- */

function load() {
  try {
    const raw = localStorage.getItem(KEY);

    if (raw) {
      const value = JSON.parse(raw);
      if (Array.isArray(value)) return value;
    }
  } catch {
    /* fall back to the seed */
  }

  return seed();
}

let tickets = load();
const listeners = new Set();

function commit(next) {
  tickets = next;

  try {
    localStorage.setItem(KEY, JSON.stringify(tickets));
  } catch {
    /* storage full or blocked: the change still lives for this session */
  }

  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => tickets;

export function useTickets() {
  const list = useSyncExternalStore(subscribe, getSnapshot);

  return useMemo(() => [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [list]);
}

export function useTicket(id) {
  const list = useSyncExternalStore(subscribe, getSnapshot);

  return list.find((ticket) => ticket.id === id) || null;
}

/* ---------- actions ---------- */

export function createTicket({ subject, category, priority, relatedOrder, description, photos }) {
  const id = `TK-${Math.floor(4900 + Math.random() * 900)}`;
  const now = new Date().toISOString();

  const ticket = {
    id,
    subject,
    category,
    priority,
    relatedOrder,
    status: "Open",
    createdAt: now,
    updatedAt: now,
    photos,
    messages: [
      { id: `${id}-1`, from: "me", name: "You", text: description, at: now },
      {
        id: `${id}-2`,
        from: "support",
        name: "ReOrbit Support",
        text: `Thanks for reaching out. Your ticket ${id} is with our team. ${SUPPORT.replyTime.replace("We usually", "We will usually")}.`,
        at: now,
        auto: true,
      },
    ],
  };

  commit([...tickets, ticket]);

  return ticket;
}

export function replyToTicket(id, text) {
  const now = new Date().toISOString();

  commit(
    tickets.map((ticket) =>
      ticket.id === id
        ? {
            ...ticket,
            status: ticket.status === "Waiting for you" || ticket.status === "Resolved" ? "Open" : ticket.status,
            updatedAt: now,
            messages: [...ticket.messages, { id: `${id}-${ticket.messages.length + 1}`, from: "me", name: "You", text, at: now }],
          }
        : ticket,
    ),
  );
}

export function setTicketStatus(id, status) {
  commit(tickets.map((ticket) => (ticket.id === id ? { ...ticket, status, updatedAt: new Date().toISOString() } : ticket)));
}

export function resetTickets() {
  commit(seed());
}

export function dateLabel(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function timeLabel(iso) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
