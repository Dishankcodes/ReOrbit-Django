/* =========================================================
   User › Shop (cart, checkout, payment). UI only, in-memory.

   Same flow as the admin shop: browse -> product -> cart ->
   checkout (delivery, payment, review) -> payment -> success.
   Buying creates real orders in ordersStore, so every purchase
   also appears in My orders and can be tracked.
   Backend later: replace with Cart / Checkout / Payment APIs.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { ITEMS, getItemById } from "../../data/marketplaceData";
import { placeOrders } from "./ordersStore";
import { markVoucherUsed } from "./rewardsStore";

const OWN_SELLER_ID = "user-aarav-patel"; // the logged-in demo user
const CART_KEY = "reorbit_user_cart";

export const WALLET_BALANCE = 15000;
export const COD_LIMIT = 10000;
export const FREE_DELIVERY_FROM = 5000;
export const DELIVERY_FEE = 50;

const loadCart = () => {
  try {
    const value = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(value) ? value.filter((c) => c && c.id && getItemById(c.id)) : [];
  } catch {
    return [];
  }
};

let state = {
  cart: loadCart(), // [{ id, qty }]
  sold: {}, // { [itemId]: qty bought this session }
  checkout: null, // { lines: [{ id, qty }], source: "cart" | "buy" }
  addresses: [
    { id: "ADR-1", label: "Home", name: "Aarav Patel", phone: "+91 98765 43210", line: "B-402, Shreeji Heights, Satellite Road", city: "Ahmedabad", state: "Gujarat", pincode: "380015" },
    { id: "ADR-2", label: "Work", name: "Aarav Patel", phone: "+91 98765 43210", line: "7th Floor, Titanium Business Park, Prahlad Nagar", city: "Ahmedabad", state: "Gujarat", pincode: "380051" },
  ],
  defaultAddress: "ADR-1",
};

const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => state;
const set = (patch) => {
  state = { ...state, ...patch };
  if (patch.cart) {
    try { window.localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch { /* ignore */ }
  }
  listeners.forEach((l) => l());
};
const useShopState = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

/* ---------- items + stock ---------- */
export function withStock(item, sold) {
  const available = Math.max(0, item.quantity - (sold[item.id] || 0));
  const own = item.sellerId === OWN_SELLER_ID;
  let reason = "";
  if (own) reason = "This is your own listing, so you can't buy it.";
  else if (available <= 0) reason = "This piece has been sold. Browse similar pieces.";
  return { ...item, available, own, purchasable: !own && available > 0, reason };
}

export function useShopItem(id) {
  const { sold } = useShopState();
  return useMemo(() => {
    const item = getItemById(id);
    return item ? withStock(item, sold) : null;
  }, [id, sold]);
}

export function useStockOf() {
  const { sold } = useShopState();
  return useMemo(() => (item) => withStock(item, sold), [sold]);
}

/* ---------- money ---------- */
export const deliveryFee = (subtotal) => (subtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE);

export function priceLines(lines, discount = 0) {
  let subtotal = 0;
  let delivery = 0;
  let co2 = 0;
  const priced = lines.map((l) => {
    const lineSubtotal = l.item.price * l.qty;
    const fee = deliveryFee(lineSubtotal);
    subtotal += lineSubtotal;
    delivery += fee;
    co2 += (l.item.co2SavedKg || 0) * l.qty;
    return { ...l, lineSubtotal, fee, lineTotal: lineSubtotal + fee };
  });
  /* a coupon is shared across the orders in proportion to their value */
  let left = Math.min(discount, subtotal);
  priced.forEach((l, i) => {
    const share = i === priced.length - 1 ? left : Math.min(left, Math.round((Math.min(discount, subtotal) * l.lineSubtotal) / (subtotal || 1)));
    l.discount = share;
    left -= share;
    l.lineTotal -= share;
  });
  return { lines: priced, subtotal, delivery, co2, discount: Math.min(discount, subtotal), total: subtotal + delivery - Math.min(discount, subtotal) };
}

/* ---------- cart ---------- */
export function useCart() {
  const { cart, sold } = useShopState();
  return useMemo(() => {
    const all = cart
      .map((c) => {
        const base = getItemById(c.id);
        if (!base) return null;
        const item = withStock(base, sold);
        return { id: c.id, item, qty: Math.min(c.qty, Math.max(item.available, 1)), unavailable: !item.purchasable };
      })
      .filter(Boolean);
    const buyable = all.filter((l) => !l.unavailable);
    return {
      all,
      count: buyable.reduce((n, l) => n + l.qty, 0),
      ...priceLines(buyable),
    };
  }, [cart, sold]);
}

export const useCartCount = () => useShopState().cart.reduce((n, c) => n + c.qty, 0);
export const useInCart = (id) => useShopState().cart.some((c) => c.id === id);

export function addToCart(id, qty = 1, max = 99) {
  const cart = state.cart.slice();
  const i = cart.findIndex((c) => c.id === id);
  if (i >= 0) cart[i] = { ...cart[i], qty: Math.min(max, cart[i].qty + qty) };
  else cart.push({ id, qty: Math.min(max, qty) });
  set({ cart });
}
export function setCartQty(id, qty, max = 99) {
  set({ cart: state.cart.map((c) => (c.id === id ? { ...c, qty: Math.max(1, Math.min(max, qty)) } : c)) });
}
export const removeFromCart = (id) => set({ cart: state.cart.filter((c) => c.id !== id) });
export const clearCart = () => set({ cart: [] });

/* ---------- addresses ---------- */
export const useAddresses = () => {
  const s = useShopState();
  return { addresses: s.addresses, defaultId: s.defaultAddress };
};
export function saveAddress(address) {
  const id = `ADR-${Date.now().toString(36).toUpperCase()}`;
  set({ addresses: [...state.addresses, { ...address, id }] });
  return id;
}
export function removeAddress(id) {
  if (state.addresses.length <= 1) return;
  const next = state.addresses.filter((a) => a.id !== id);
  set({ addresses: next, defaultAddress: state.defaultAddress === id ? next[0].id : state.defaultAddress });
}
export const setDefaultAddress = (id) => set({ defaultAddress: id });
export const updateAddress = (id, patch) =>
  set({ addresses: state.addresses.map((a) => (a.id === id ? { ...a, ...patch } : a)) });

/* ---------- checkout ---------- */
export const startCheckout = (lines, source = "cart") => set({ checkout: { lines, source } });

/* The lines being paid for, priced. Falls back to the cart. */
export function useCheckoutLines() {
  const { checkout, cart, sold } = useShopState();
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
    return { source: checkout?.source || "cart", ...priceLines(lines) };
  }, [checkout, cart, sold]);
}

/* ---------- payment (simulated) ---------- */
export const PAYMENT_METHODS = [
  { key: "UPI", label: "UPI", hint: "Google Pay, PhonePe, Paytm, BHIM" },
  { key: "CARD", label: "Credit / debit card", hint: "Visa, Mastercard, RuPay" },
  { key: "NET_BANKING", label: "Net banking", hint: "All major Indian banks" },
  { key: "WALLET", label: "ReOrbit Wallet", hint: `Balance ₹${WALLET_BALANCE.toLocaleString("en-IN")}` },
  { key: "COD", label: "Pay on delivery", hint: "Cash or UPI to the delivery partner" },
];

/* Demo rules: a card ending in 0000 or a UPI id containing “fail” is
   declined, so the failure screen can be tried. */
function judge(method, detail, total) {
  if (method === "UPI" && /fail/i.test(detail.upi || "")) return "The bank declined this UPI request. Please try another UPI ID or method.";
  if (method === "CARD" && (detail.card || "").replace(/\s/g, "").endsWith("0000")) return "Your card was declined by the bank. Please try another card or method.";
  if (method === "WALLET" && total > WALLET_BALANCE) return "Your wallet balance is too low for this order.";
  return null;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const digits = (n) => String(Math.floor(Math.random() * 10 ** n)).padStart(n, "0");

/* Takes the money (pretend) and creates one order per listing. */
export async function payAndPlace({ lines, address, method, detail = {}, note = "", coupon = null }) {
  const quote = priceLines(lines, coupon ? coupon.amount : 0);
  await wait(2200);
  const error = judge(method, detail, quote.total);
  if (error) return { ok: false, error };

  const paid = method !== "COD";
  const prefix = method === "NET_BANKING" ? "NB" : method === "WALLET" ? "WAL" : method.slice(0, 3);
  const reference = paid ? `${prefix}${digits(9)}` : null;

  const orderIds = placeOrders(
    quote.lines.map((l) => ({
      itemId: l.id,
      qty: l.qty,
      price: l.item.price,
      shipping: l.fee,
      discount: l.discount || 0,
      payment: method,
      address: { name: address.name, line: address.line, city: address.city, state: address.state, pincode: address.pincode, phone: address.phone },
      reference,
      note,
    })),
  );

  if (coupon) markVoucherUsed(coupon.code);

  const sold = { ...state.sold };
  quote.lines.forEach((l) => { sold[l.id] = (sold[l.id] || 0) + l.qty; });
  const boughtIds = new Set(quote.lines.map((l) => l.id));
  set({ sold, cart: state.cart.filter((c) => !boughtIds.has(c.id)), checkout: null });

  return { ok: true, orderIds, total: quote.total, method };
}

export const SHOP_ITEMS = ITEMS;
