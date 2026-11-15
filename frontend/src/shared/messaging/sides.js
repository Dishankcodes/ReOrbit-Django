import {
  ADMIN_KINDS,
  REMAKER_KINDS,
  USER_KINDS,
} from "../messagingStore";

/* Everything that differs between the three messaging screens. The markup and
   behaviour are shared; each side keeps its own look through these class names. */
export const SIDES = {
  user: {
    basePath: "/user-messages",
    kinds: USER_KINDS,
    sectionClass: "um-chat umsg",
    p: "umsg",
    btn: "umsg-btn",
    tool: "umsg-tool",
    err: "umsg-error",
    chips: "umsg-chips",
    search: "umsg-search",
    empty: "Select a chat from the list to read your messages and reply to sellers, ReMakers or ReOrbit Support.",
  },
  remaker: {
    basePath: "/remaker-messages",
    kinds: REMAKER_KINDS,
    sectionClass: "rk msg",
    p: "msg",
    btn: "rk-btn",
    tool: "rk-textbtn",
    err: "rk-error",
    chips: "rk-chips",
    search: "msgx-search",
    empty: "Select a chat from the list to reply to your customers, other ReMakers or ReOrbit.",
  },
  admin: {
    basePath: "/admin-messages",
    kinds: ADMIN_KINDS,
    sectionClass: "um-chat umsg admin-messaging",
    p: "umsg",
    btn: "umsg-btn",
    tool: "umsg-tool",
    err: "umsg-error",
    chips: "umsg-chips",
    search: "umsg-search",
    empty: "Select a chat from the list to respond to customers, ReMakers or the support queue.",
  },
};

/* Where the "About" card of a chat goes, for the person looking at it.
   Returns null when there is nothing worth showing.
   - Only chats started from a product, order or donation have one.
   - Product pages are public, so everyone gets that link.
   - Order and donation pages belong to whoever started the chat (`mine`);
     an admin can open any of them. Anyone else sees the card without a link,
     instead of a link that lands on the home page. */
export function resolveContext(conversation, side) {
  const ctx = conversation?.context;
  if (!ctx || typeof ctx !== "object") return null;
  if (conversation.kind === "reorbit" || conversation.kind === "support") return null;
  const label = String(ctx.label || "").trim();
  if (!label) return null;

  const path = String(ctx.to || "");
  const product = /^\/user-marketplace\/(product|seller|remaker)\//.test(path);
  const order = /^\/user-orders\//.test(path);
  const donation = /^\/user-donations\//.test(path);
  let to = null;

  if (side === "admin") {
    if (product || /^\/user-marketplace/.test(path)) to = path.replace(/^\/user-marketplace/, "/admin-shop");
    else if (order) to = path.replace(/^\/user-orders/, "/admin-orders");
    else if (donation) to = path.replace(/^\/user-donations/, "/admin-donations");
  } else if (side === "remaker") {
    if (product) to = path.replace(/^\/user-marketplace/, "/remaker-marketplace");
    else if (order && ctx.mine) to = path.replace(/^\/user-orders/, "/remaker-orders");
  } else if (product || ((order || donation) && ctx.mine)) {
    to = path;
  }
  return { label, image: ctx.image || "", to };
}

/* Link to the other person's profile, or null */
export function profileLink(conversation, side) {
  const peer = conversation?.peer;
  if (!peer?.id) return null;
  if (side === "admin") {
    if (peer.type === "user") return `/admin-users/${peer.id}`;
    if (peer.type === "remaker") return `/admin-remakers/${peer.id}`;
    return null;
  }
  if (side === "remaker") {
    return peer.type === "user" ? `/remaker-customers/${peer.id}` : null;
  }
  if (peer.type === "remaker") return `/user-marketplace/remaker/${peer.id}`;
  if (peer.type === "user") return `/user-marketplace/seller/${peer.id}`;
  return null;
}
