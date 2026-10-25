/* =========================================================
   REMAKER MESSAGES - UI STORE (no backend yet)
   The chat module from the project notes: customers talking to the
   ReMaker, ReMakers talking to each other, and the ReOrbit team.

   Conversations live in localStorage so what you send is still there
   after a refresh. Swap for a real chat API later.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";

const KEY = "reorbit_remaker_messages_v1";
const NOW = Date.now();
const ago = (minutes) => new Date(NOW - minutes * 60000).toISOString();

const U = "/images/users/";
const M = "/images/remakers/";
const P = "/images/portfolio/";

export const KINDS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "customer", label: "Customers" },
  { key: "remaker", label: "ReMakers" },
  { key: "reorbit", label: "ReOrbit" },
];

export const QUICK_REPLIES = {
  customer: [
    "Thank you for your order! I will pack it today.",
    "Your order is ready for pickup whenever you are free.",
    "Happy to share more photos. Which angle would you like?",
    "It is made from reclaimed wood, so small marks are part of its character.",
  ],
  remaker: [
    "Love your work! How did you finish the surface?",
    "Would you like to collaborate on a piece?",
    "Thanks for the tip, that helps a lot.",
  ],
  reorbit: [
    "Thanks, I will update the job today.",
    "Could you share the pickup window?",
    "I have uploaded the progress photos.",
  ],
};

/* [id, kind, name, subtitle, image, customerId, context, messages, unread] */
function seed() {
  return [
    {
      id: "cv-1",
      kind: "customer",
      name: "Meera Iyer",
      subtitle: "Customer in Bengaluru",
      image: U + "meera-iyer.jpg",
      customerId: "c-meera",
      context: {
        label: "Order SO-31084 · Teak Door Console Table",
        to: "/remaker-sales/SO-31084",
        image: P + "tara-console.jpg",
      },
      unread: 2,
      messages: [
        {
          id: "a1",
          from: "system",
          text: "Meera placed order SO-31084.",
          at: ago(75),
        },
        {
          id: "a2",
          from: "them",
          text: "Hi! I just ordered the console table. Does it come with the iron legs shown in the photos?",
          at: ago(70),
        },
        {
          id: "a3",
          from: "me",
          text: "Hello Meera, thank you! Yes, the iron legs are included and already attached.",
          at: ago(64),
        },
        {
          id: "a4",
          from: "them",
          text: "Lovely. Could you also share a photo of the carved panel up close?",
          at: ago(12),
        },
        {
          id: "a5",
          from: "them",
          text: "And how long will packing take?",
          at: ago(11),
        },
      ],
    },
    {
      id: "cv-2",
      kind: "customer",
      name: "Rohan Shah",
      subtitle: "Customer in Pune",
      image: U + "rohan-shah.jpg",
      customerId: "c-rohan",
      context: {
        label: "Order SO-31079 · 2 × Floor Lamp",
        to: "/remaker-sales/SO-31079",
        image: P + "arjun-lamp.jpg",
      },
      unread: 0,
      messages: [
        {
          id: "b1",
          from: "them",
          text: "Hi, will both lamps be wrapped separately? They are for a gift.",
          at: ago(500),
        },
        {
          id: "b2",
          from: "me",
          text: "Yes, each lamp gets its own box and cloth wrap. I can add a handwritten note too.",
          at: ago(480),
        },
        {
          id: "b3",
          from: "them",
          text: "A note would be perfect, thank you!",
          at: ago(470),
        },
      ],
    },
    {
      id: "cv-3",
      kind: "customer",
      name: "Anaya Singh",
      subtitle: "Customer in Jaipur",
      image: U + "anaya-singh.jpg",
      customerId: "c-anaya",
      context: {
        label: "Order SO-31071 · Denim Patchwork Tote",
        to: "/remaker-sales/SO-31071",
        image: P + "priya-bag.jpg",
      },
      unread: 1,
      messages: [
        {
          id: "c1",
          from: "me",
          text: "Your tote is ready to collect. I am home until 7 pm.",
          at: ago(190),
        },
        {
          id: "c2",
          from: "them",
          text: "Great, I will come by around 6. Is there parking nearby?",
          at: ago(35),
        },
      ],
    },
    {
      id: "cv-4",
      kind: "remaker",
      name: "Tara Bose",
      subtitle: "ReMaker · Furniture restoration, Kolkata",
      image: M + "tara-bose.jpg",
      customerId: "c-tara",
      context: null,
      unread: 0,
      messages: [
        {
          id: "d1",
          from: "them",
          text: "Your wire brushed grille shelf is gorgeous. What sealant did you use?",
          at: ago(2600),
        },
        {
          id: "d2",
          from: "me",
          text: "Thank you Tara! A matte clear sealant, two thin coats. I can send the product name.",
          at: ago(2580),
        },
        {
          id: "d3",
          from: "them",
          text: "Please do. Thinking of using it on a window frame project.",
          at: ago(2570),
        },
      ],
    },
    {
      id: "cv-5",
      kind: "remaker",
      name: "Arjun Mehta",
      subtitle: "ReMaker · Lighting, Ahmedabad",
      image: M + "arjun-mehta.jpg",
      customerId: "",
      context: null,
      unread: 0,
      messages: [
        {
          id: "e1",
          from: "me",
          text: "Arjun, would you be up for a joint lamp and console set for the festive season?",
          at: ago(5200),
        },
        {
          id: "e2",
          from: "them",
          text: "Sounds great! Let us meet at the workshop next week and sketch it out.",
          at: ago(5100),
        },
      ],
    },
    {
      id: "cv-6",
      kind: "reorbit",
      name: "ReOrbit Warehouse Team",
      subtitle: "Refurbishing jobs",
      image: "",
      customerId: "",
      context: {
        label: "Job JB-5098 · Cane-back dining chair",
        to: "/remaker-jobs/JB-5098",
        image: P + "before-tara-chair.jpg",
      },
      unread: 1,
      messages: [
        {
          id: "f1",
          from: "system",
          text: "You were assigned job JB-5098.",
          at: ago(3000),
        },
        {
          id: "f2",
          from: "them",
          text: "Hi Nivya! The chair for JB-5098 is ready for collection at the Naroda warehouse. Anytime between 10 am and 5 pm works.",
          at: ago(2900),
        },
        {
          id: "f3",
          from: "me",
          text: "Thanks, I will collect it on Saturday morning.",
          at: ago(2880),
        },
        {
          id: "f4",
          from: "them",
          text: "Reminder: please upload progress photos by Friday so we can plan the quality check.",
          at: ago(60),
        },
      ],
    },
    {
      id: "cv-7",
      kind: "reorbit",
      name: "ReOrbit Support",
      subtitle: "Help and support",
      image: "",
      customerId: "",
      context: {
        label: "Ticket TK-4821 · Payout amount",
        to: "/remaker-help/tickets/TK-4821",
        image: "",
      },
      unread: 0,
      messages: [
        {
          id: "g1",
          from: "them",
          text: "Welcome to ReOrbit! If you ever need help, message us here or open a ticket from Help and support.",
          at: ago(9000),
        },
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

let conversations = load();
const listeners = new Set();

function commit(next) {
  conversations = next;

  try {
    localStorage.setItem(KEY, JSON.stringify(conversations));
  } catch {
    /* storage full or blocked: the change still lives for this session */
  }

  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => conversations;

export function lastMessage(conversation) {
  return conversation.messages[conversation.messages.length - 1];
}

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

  return list.find((item) => item.id === id) || null;
}

export function useTotalUnread() {
  const list = useSyncExternalStore(subscribe, getSnapshot);

  return useMemo(
    () => list.reduce((total, item) => total + item.unread, 0),
    [list],
  );
}

/* ---------- actions ---------- */

export function sendMessage(id, { text = "", image = "" }) {
  const now = new Date().toISOString();

  commit(
    conversations.map((item) =>
      item.id === id
        ? {
            ...item,
            unread: 0,
            messages: [
              ...item.messages,
              {
                id: `${id}-${item.messages.length + 1}-${Date.now()}`,
                from: "me",
                text: text.trim(),
                image,
                at: now,
              },
            ],
          }
        : item,
    ),
  );
}

export function markConversationRead(id) {
  const target = conversations.find((item) => item.id === id);
  if (!target || target.unread === 0) return;

  commit(
    conversations.map((item) =>
      item.id === id ? { ...item, unread: 0 } : item,
    ),
  );
}

export function markConversationUnread(id) {
  commit(
    conversations.map((item) =>
      item.id === id ? { ...item, unread: Math.max(item.unread, 1) } : item,
    ),
  );
}

export function resetMessages() {
  commit(seed());
}

export function clockLabel(iso) {
  return new Date(iso)
    .toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
}

export function listTime(iso) {
  const date = new Date(iso);
  const today = new Date();
  const startToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();

  if (date.getTime() >= startToday) return clockLabel(iso);
  if (date.getTime() >= startToday - 86400000) return "Yesterday";

  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function dayLabel(iso) {
  const date = new Date(iso);
  const today = new Date();
  const startToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();

  if (date.getTime() >= startToday) return "Today";
  if (date.getTime() >= startToday - 86400000) return "Yesterday";

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
