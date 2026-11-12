/* =========================================================
   USER MESSAGES - UI STORE (no backend yet)

   Who a member can talk to:
   - sellers      (people selling something you want)
   - buyers       (people buying something you listed)
   - ReMakers     (about their pieces or a custom idea)
   - ReOrbit      (support, pickups, order help)

   Conversations are kept in localStorage so a refresh does not lose
   them. A chat can be started from a product, a seller, a ReMaker, an
   order or a listing with startConversation().
   Backend later: swap for a chat API (list, send, mark read, start).
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";

const KEY = "reorbit_user_messages_v1";
const NOW = Date.now();
const ago = (minutes) => new Date(NOW - minutes * 60000).toISOString();

const U = "/images/users/";
const M = "/images/remakers/";
const P = "/images/products/";

export const KINDS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "seller", label: "Sellers" },
  { key: "buyer", label: "Buyers" },
  { key: "remaker", label: "ReMakers" },
  { key: "reorbit", label: "ReOrbit" },
];

export const QUICK_REPLIES = {
  seller: [
    "Is this still available?",
    "Can you share one more photo of the condition?",
    "Is the price negotiable?",
    "Can you deliver to my pincode?",
  ],
  buyer: [
    "Thank you! I will pack it today.",
    "Yes, it is still available.",
    "Happy to share more photos.",
    "I can hold it for you until tomorrow.",
  ],
  remaker: [
    "Love your work! Can you make something similar?",
    "What materials did you use?",
    "How long would a custom piece take?",
  ],
  reorbit: [
    "Thanks, that helps.",
    "Could you update me on this?",
    "I have added the details you asked for.",
  ],
};

/* The first reply a person or team gives to a brand-new chat, so the demo feels alive. */
const WELCOME = {
  seller:
    "Hi! Thanks for getting in touch. I'll reply properly in a little while.",
  buyer: "Hi, thanks for your message! Let me check and get back to you.",
  remaker: "Hello, and thank you for writing! I usually reply within a day.",
  reorbit:
    "Thanks for reaching out to ReOrbit. A team member will reply shortly.",
};

function seed() {
  return [
    {
      id: "cv-u1",
      key: "remaker:tara-bose",
      kind: "remaker",
      name: "Tara Bose",
      subtitle: "ReMaker · Kolkata",
      image: M + "tara-bose.jpg",
      context: {
        label: "Order RO-10531 · Restored teak cabinet",
        to: "/user-orders/RO-10531",
        image:
          "https://images.pexels.com/photos/8134812/pexels-photo-8134812.jpeg?auto=compress&cs=tinysrgb&w=1000",
      },
      unread: 1,
      messages: [
        {
          id: "a1",
          from: "system",
          text: "You placed order RO-10531.",
          at: ago(2600),
        },
        {
          id: "a2",
          from: "me",
          text: "Hi Tara, will the cabinet arrive with the brass handles shown in the photos?",
          at: ago(2590),
        },
        {
          id: "a3",
          from: "them",
          text: "Hello! Yes, the original brass handles are cleaned and fitted.",
          at: ago(2500),
        },
        {
          id: "a4",
          from: "them",
          text: "It was packed this morning, so the courier picks it up tomorrow.",
          at: ago(60),
        },
      ],
    },
    {
      id: "cv-u2",
      key: "seller:user-rohan-shah",
      kind: "seller",
      name: "Rohan Shah",
      subtitle: "Seller · Pune",
      image: U + "rohan-shah.jpg",
      context: {
        label: "Vintage reading chair · ₹2,800",
        to: "/user-marketplace/product/vintage-reading-chair",
        image:
          "https://images.pexels.com/photos/1148955/pexels-photo-1148955.jpeg?auto=compress&cs=tinysrgb&w=1000",
      },
      unread: 0,
      messages: [
        {
          id: "b1",
          from: "me",
          text: "Hi Rohan, is the reading chair still available?",
          at: ago(4300),
        },
        {
          id: "b2",
          from: "them",
          text: "Yes it is. The cushion was washed last week.",
          at: ago(4250),
        },
        {
          id: "b3",
          from: "me",
          text: "Great, I will add it to my cart.",
          at: ago(4240),
        },
      ],
    },
    {
      id: "cv-u3",
      key: "buyer:anaya-singh",
      kind: "buyer",
      name: "Anaya Singh",
      subtitle: "Buyer · Ahmedabad",
      image: U + "anaya-singh.jpg",
      context: {
        label: "Your listing · Mid-century teak side table",
        to: "/user-sell",
        image:
          "https://images.pexels.com/photos/11112739/pexels-photo-11112739.jpeg?auto=compress&cs=tinysrgb&w=1000",
      },
      unread: 2,
      messages: [
        {
          id: "c1",
          from: "them",
          text: "Hello! Does the side table have any scratches on the top?",
          at: ago(95),
        },
        {
          id: "c2",
          from: "them",
          text: "Also, would you do ₹4,200 for it?",
          at: ago(92),
        },
      ],
    },
    {
      id: "cv-u4",
      key: "reorbit:support",
      kind: "reorbit",
      name: "ReOrbit Support",
      subtitle: "Ticket TKT-4802",
      image: "",
      context: {
        label: "Parcel marked delivered but not received",
        to: "/user-help/tickets/TKT-4802",
      },
      unread: 0,
      messages: [
        {
          id: "d1",
          from: "system",
          text: "You opened ticket TKT-4802.",
          at: ago(1500),
        },
        {
          id: "d2",
          from: "them",
          text: "Hi Nivya, we are sorry about this. We have asked the courier for proof of delivery.",
          at: ago(1380),
        },
        {
          id: "d3",
          from: "me",
          text: "Thank you. I checked with my neighbours too, nobody has it.",
          at: ago(1300),
        },
      ],
    },
    {
      id: "cv-u5",
      key: "reorbit:pickup",
      kind: "reorbit",
      name: "ReOrbit Pickup Team",
      subtitle: "Donation DON-2046",
      image: "",
      context: {
        label: "Engineering textbooks · picked up",
        to: "/user-donations/DON-2046",
      },
      unread: 0,
      messages: [
        {
          id: "e1",
          from: "them",
          text: "Your donation was picked up today. Thank you for giving these books a second life.",
          at: ago(300),
        },
      ],
    },
    {
      id: "cv-u6",
      key: "remaker:priya-shah",
      kind: "remaker",
      name: "Priya Shah",
      subtitle: "ReMaker · Mumbai",
      image: M + "priya-shah.jpg",
      context: {
        label: "Recovered textile lifestyle bag · ₹1,200",
        to: "/user-marketplace/product/recovered-textile-bag",
        image:
          "https://images.pexels.com/photos/10566057/pexels-photo-10566057.jpeg?auto=compress&cs=tinysrgb&w=1000",
      },
      unread: 0,
      messages: [
        {
          id: "f1",
          from: "me",
          text: "Hi Priya, could you make the bag in a darker colour?",
          at: ago(8000),
        },
        {
          id: "f2",
          from: "them",
          text: "I can! It takes about a week since I need the right fabric.",
          at: ago(7900),
        },
      ],
    },
  ];
}

let conversations = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {
    /* start from the demo data */
  }
  return seed();
})();

const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => conversations;

function commit(next) {
  conversations = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(conversations));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export const lastMessage = (c) => c.messages[c.messages.length - 1];

export function useConversations() {
  const list = useSyncExternalStore(subscribe, getSnapshot);
  return useMemo(
    () =>
      [...list].sort((a, b) =>
        lastMessage(b).at.localeCompare(lastMessage(a).at),
      ),
    [list],
  );
}

export function useConversation(id) {
  const list = useSyncExternalStore(subscribe, getSnapshot);
  return list.find((c) => c.id === id) || null;
}

export function useTotalUnread() {
  const list = useSyncExternalStore(subscribe, getSnapshot);
  return useMemo(() => list.reduce((n, c) => n + c.unread, 0), [list]);
}

/* ---------- actions ---------- */

const mid = (id, n) =>
  `${id}-${n}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export function sendMessage(id, { text = "", image = "" }) {
  const now = new Date().toISOString();
  const target = conversations.find((c) => c.id === id);
  if (!target) return;
  commit(
    conversations.map((c) =>
      c.id === id
        ? {
            ...c,
            unread: 0,
            messages: [
              ...c.messages,
              {
                id: mid(id, c.messages.length + 1),
                from: "me",
                text: text.trim(),
                image,
                at: now,
              },
            ],
          }
        : c,
    ),
  );

  /* a brand-new chat gets one friendly first reply */
  if (
    target.messages.filter((m) => m.from === "them").length === 0 &&
    WELCOME[target.kind]
  ) {
    window.setTimeout(() => {
      const cur = conversations.find((c) => c.id === id);
      if (!cur) return;
      commit(
        conversations.map((c) =>
          c.id === id
            ? {
                ...c,
                unread: c.unread + 1,
                messages: [
                  ...c.messages,
                  {
                    id: mid(id, c.messages.length + 1),
                    from: "them",
                    text: WELCOME[target.kind],
                    at: new Date().toISOString(),
                  },
                ],
              }
            : c,
        ),
      );
    }, 2200);
  }
}

export function markConversationRead(id) {
  const t = conversations.find((c) => c.id === id);
  if (!t || t.unread === 0) return;
  commit(conversations.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
}

export function markConversationUnread(id) {
  commit(
    conversations.map((c) =>
      c.id === id ? { ...c, unread: Math.max(c.unread, 1) } : c,
    ),
  );
}

export function deleteConversation(id) {
  commit(conversations.filter((c) => c.id !== id));
}

/* Open (or create) the chat with one person about one thing, and return its id.
   key examples: "seller:user-rohan-shah", "remaker:tara-bose", "reorbit:support" */
export function startConversation({
  key,
  kind,
  name,
  subtitle,
  image = "",
  context = null,
}) {
  const found = conversations.find((c) => c.key === key);
  if (found) {
    if (context && JSON.stringify(found.context) !== JSON.stringify(context)) {
      commit(
        conversations.map((c) => (c.id === found.id ? { ...c, context } : c)),
      );
    }
    return found.id;
  }
  const id = `cv-u${Date.now()}`;
  commit([
    ...conversations,
    {
      id,
      key,
      kind,
      name,
      subtitle,
      image,
      context,
      unread: 0,
      messages: [
        {
          id: `${id}-0`,
          from: "system",
          text: `You started a chat with ${name}.`,
          at: new Date().toISOString(),
        },
      ],
    },
  ]);
  return id;
}

export function resetMessages() {
  commit(seed());
}

/* ---------- time labels ---------- */
export function clockLabel(iso) {
  return new Date(iso)
    .toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
}
const startToday = () => {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
};
export function listTime(iso) {
  const d = new Date(iso);
  if (d.getTime() >= startToday()) return clockLabel(iso);
  if (d.getTime() >= startToday() - 86400000) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
export function dayLabel(iso) {
  const d = new Date(iso);
  if (d.getTime() >= startToday()) return "Today";
  if (d.getTime() >= startToday() - 86400000) return "Yesterday";
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
