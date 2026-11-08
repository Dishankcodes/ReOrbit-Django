/* =========================================================
   User › Shop (cart, checkout, payment). UI only, in-memory.

   Same flow as the admin shop: browse -> product -> cart ->
   checkout (delivery, payment, review) -> payment -> success.
   Buying creates real orders in ordersStore, so every purchase
   also appears in My orders and can be tracked.
   Backend later: replace with Cart / Checkout / Payment APIs.
   ========================================================= */

import { useLiveMarketplace } from "./liveMarketplace";
import { useMemo, useSyncExternalStore } from "react";
import { ITEMS, getItemById } from "../../data/marketplaceData";
import { deliveryFor, platformFeeOf, getCommerce } from "../../shared/commerce";

const OWN_SELLER_ID = "user-aarav-patel"; // the logged-in demo user
const CART_KEY = "reorbit_user_cart";

/* Delivery, the platform fee and the cash-on-delivery limit come from
   Admin > Settings > Commerce (see shared/commerce.js). */

const loadCart = () => {
  try {
    const value = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(value)
      /* Real products are not in the catalogue until the live marketplace has loaded,
         so keep every well-formed entry; the cart screens hide ones that stay unknown. */
      ? value.filter((c) => c && c.id && Number(c.qty) >= 1)
      : [];
  } catch {
    return [];
  }
};

let state = {
  cart: loadCart(), // [{ id, qty }]
  sold: {}, // { [itemId]: qty bought this session }
  checkout: null, // { lines: [{ id, qty }], source: "cart" | "buy" }
};

const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;
const set = (patch) => {
  state = { ...state, ...patch };
  if (patch.cart) {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l());
};
const useShopState = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

/* ---------- items + stock ---------- */
export function withStock(item, sold) {
  const available = Math.max(0, item.quantity - (sold[item.id] || 0));
  const own = item.sellerId === OWN_SELLER_ID;
  let reason = "";
  if (own) reason = "This is your own listing, so you can't buy it.";
  else if (available <= 0)
    reason = "This piece has been sold. Browse similar pieces.";
  return {
    ...item,
    available,
    own,
    purchasable: !own && available > 0,
    reason,
  };
}

/* `version` changes when the live marketplace rows arrive, so a page opened directly
   (before they load) picks the item up once they do. */
export function useShopItem(id, version = 0) {
  const { sold } = useShopState();
  return useMemo(() => {
    const item = getItemById(id);
    return item ? withStock(item, sold) : null;
  }, [id, sold, version]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useStockOf() {
  const { sold } = useShopState();
  return useMemo(() => (item) => withStock(item, sold), [sold]);
}

/* ---------- money ---------- */
/* ReOrbit's own listings carry no platform fee. */
const feeApplies = (item) => item.sellerType !== "platform";
export const deliveryFee = (subtotal, item = {}) =>
  deliveryFor({
    sellerType: item.sellerType === "remaker" ? "remaker" : "user",
    pickup: item.pickup || "platform",
    subtotal,
  });
export const platformFee = (subtotal, item = {}) =>
  feeApplies(item) ? platformFeeOf(subtotal) : 0;

export function priceLines(lines, discount = 0) {
  let subtotal = 0;
  let delivery = 0;
  let fees = 0;
  let co2 = 0;
  const priced = lines.map((l) => {
    const lineSubtotal = l.item.price * l.qty;
    const fee = deliveryFee(lineSubtotal, l.item);
    const pfee = platformFee(lineSubtotal, l.item);
    subtotal += lineSubtotal;
    delivery += fee;
    fees += pfee;
    co2 += (l.item.co2SavedKg || 0) * l.qty;
    return {
      ...l,
      lineSubtotal,
      fee,
      platformFee: pfee,
      lineTotal: lineSubtotal + fee + pfee,
    };
  });
  /* a coupon is shared across the orders in proportion to their value */
  let left = Math.min(discount, subtotal);
  priced.forEach((l, i) => {
    const share =
      i === priced.length - 1
        ? left
        : Math.min(
            left,
            Math.round(
              (Math.min(discount, subtotal) * l.lineSubtotal) / (subtotal || 1),
            ),
          );
    l.discount = share;
    left -= share;
    l.lineTotal -= share;
  });
  return {
    lines: priced,
    subtotal,
    delivery,
    platformFee: fees,
    co2,
    discount: Math.min(discount, subtotal),
    total: subtotal + delivery + fees - Math.min(discount, subtotal),
  };
}

/* ---------- cart ---------- */
export function useCart() {
  const { cart, sold } = useShopState();
  /* live products arrive from the server; the cart waits for them instead of showing empty */
  const live = useLiveMarketplace();
  return useMemo(() => {
    const all = cart
      .map((c) => {
        const base = getItemById(c.id);
        if (!base) return null;
        const item = withStock(base, sold);
        return {
          id: c.id,
          item,
          qty: Math.min(c.qty, Math.max(item.available, 1)),
          unavailable: !item.purchasable,
        };
      })
      .filter(Boolean);
    const buyable = all.filter((l) => !l.unavailable);
    return {
      all,
      count: buyable.reduce((n, l) => n + l.qty, 0),
      loadingItems: cart.length > 0 && !live.ready && all.length < cart.length,
      ...priceLines(buyable),
    };
  }, [cart, sold, live.version, live.ready]);
}

export const useCartCount = () =>
  useShopState().cart.reduce((n, c) => n + c.qty, 0);
export const useInCart = (id) => useShopState().cart.some((c) => c.id === id);

export function addToCart(id, qty = 1, max = 99) {
  const cart = state.cart.slice();
  const i = cart.findIndex((c) => c.id === id);
  if (i >= 0) cart[i] = { ...cart[i], qty: Math.min(max, cart[i].qty + qty) };
  else cart.push({ id, qty: Math.min(max, qty) });
  set({ cart });
}
export function setCartQty(id, qty, max = 99) {
  set({
    cart: state.cart.map((c) =>
      c.id === id ? { ...c, qty: Math.max(1, Math.min(max, qty)) } : c,
    ),
  });
}
export const removeFromCart = (id) =>
  set({ cart: state.cart.filter((c) => c.id !== id) });
export const clearCart = () => set({ cart: [] });

/* ---------- checkout ---------- */
export const startCheckout = (lines, source = "cart") =>
  set({ checkout: { lines, source } });

/* The lines being paid for, priced. Falls back to the cart. */
export function useCheckoutLines() {
  const { checkout, cart, sold } = useShopState();
  const live = useLiveMarketplace();
  return useMemo(() => {
    const source = checkout ? checkout.lines : cart;
    const lines = source
      .map((c) => {
        const base = getItemById(c.id);
        if (!base) return null;
        const item = withStock(base, sold);
        return { id: c.id, item, qty: Math.min(c.qty, item.available) };
      })
      .filter((l) => l && l.item.purchasable && l.qty > 0);
    return {
      source: checkout?.source || "cart",
      loadingItems: (checkout ? checkout.lines : cart).length > 0 && !live.ready && lines.length === 0,
      ...priceLines(lines),
    };
  }, [checkout, cart, sold, live.version, live.ready]);
}

export const SHOP_ITEMS = ITEMS;
export { getCommerce };
