/* =========================================================
   Admin › Shop (buy products as the admin). UI only, in-memory.

   The shop lists what is live on the marketplace (derived from
   productsStore, so it is the same data as Admin › Products).
   Buying creates real rows in the Orders store with
   buyer = Admin, so every purchase also shows in Admin › Orders.

   Flow: browse -> product -> cart -> checkout -> payment ->
         success -> purchase history.
   Backend later: replace with Cart / Checkout / Payment APIs.
   ========================================================= */

import { getSettings } from "./settingsStore";
import { useMemo, useSyncExternalStore } from "react";
import { useProducts } from "./productsStore";
import { useOrders, addOrders, runOrderAction } from "./ordersStore";
import { ADMIN_PARTY, WAREHOUSE_ADDRESS } from "./adminOrders";
import { DEMO_TODAY } from "../utils/format";

/* ---------- state ---------- */
let state = {
  cart: [], // [{ id, qty }]
  sold: {}, // { [productId]: qty bought this session }
  wishlist: new Set(),
  checkout: null, // { lines: [{ id, qty }], source: "cart" | "buy" }
  orderSeq: 0,
  addresses: [
    {
      id: "ADR-1",
      label: "Warehouse",
      name: "ReOrbit Warehouse",
      phone: WAREHOUSE_ADDRESS.phone,
      address: WAREHOUSE_ADDRESS.address,
      city: WAREHOUSE_ADDRESS.city,
      state: WAREHOUSE_ADDRESS.state,
      pincode: WAREHOUSE_ADDRESS.pincode,
    },
    {
      id: "ADR-2",
      label: "Head office",
      name: "ReOrbit Admin Office",
      phone: "+91 79000 54321",
      address: "4th Floor, Orbit Tower, SG Highway",
      city: "Ahmedabad",
      state: "Gujarat",
      pincode: "380054",
    },
  ],
  defaultAddress: "ADR-1",
};
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;
const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const useShopState = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const WALLET_BALANCE = 25000; // mock "ReOrbit Wallet" balance for the admin

/* ---------- products ---------- */
function withStock(p, sold) {
  const available = Math.max(0, p.quantity - (sold[p.id] || 0));
  const sellerOk = p.owner.status === "Active";
  return {
    ...p,
    available,
    sellerOk,
    purchasable: p.state === "live" && available > 0 && sellerOk,
  };
}

/* every product the admin could buy right now */
export function useShopProducts() {
  const products = useProducts();
  const { sold } = useShopState();
  return useMemo(
    () => products.map((p) => withStock(p, sold)).filter((p) => p.purchasable),
    [products, sold],
  );
}

/* any product by id (also the ones that are no longer buyable, so a
   details page can say why) */
export function useShopProduct(id) {
  const products = useProducts();
  const { sold } = useShopState();
  return useMemo(() => {
    const p = products.find((x) => x.id === id);
    return p ? withStock(p, sold) : null;
  }, [products, sold, id]);
}

/* the seller behind a listing: either a User or a ReMaker */
export function useSeller(sellerId) {
  const products = useProducts();
  const { sold } = useShopState();
  return useMemo(() => {
    const mine = products
      .filter((p) => p.owner.id === sellerId)
      .map((p) => withStock(p, sold));
    if (!mine.length) return null;
    const owner = mine[0].owner;
    const live = mine.filter((p) => p.purchasable);
    const reviews = mine.flatMap((p) => p.reviews || []);
    const rating = reviews.length
      ? Math.round(
          (reviews.reduce((n, r) => n + (r.rating || 0), 0) / reviews.length) *
            10,
        ) / 10
      : null;
    return { owner, products: mine, live, reviews, rating };
  }, [products, sold, sellerId]);
}

/* ---------- money ---------- */
export function deliveryFee(product, subtotal) {
  const c = getSettings().commerce;
  if (product.type === "item")
    return product.pickup === "Managed by platform" ? c.itemDelivery : 0;
  return subtotal >= c.freeDeliveryFrom ? 0 : c.productDelivery;
}

export function priceLines(lines) {
  let subtotal = 0;
  let delivery = 0;
  const priced = lines.map((l) => {
    const lineSubtotal = l.product.price * l.qty;
    const fee = deliveryFee(l.product, lineSubtotal);
    subtotal += lineSubtotal;
    delivery += fee;
    return { ...l, lineSubtotal, fee, lineTotal: lineSubtotal + fee };
  });
  /* the platform fee is waived when the platform itself is the buyer */
  return {
    lines: priced,
    subtotal,
    delivery,
    platformFee: 0,
    total: subtotal + delivery,
  };
}

/* ---------- cart ---------- */
export function useCart() {
  const products = useProducts();
  const { cart, sold } = useShopState();
  return useMemo(() => {
    const lines = cart
      .map((c) => {
        const p = products.find((x) => x.id === c.id);
        if (!p) return null;
        const product = withStock(p, sold);
        return {
          id: c.id,
          product,
          qty: Math.min(c.qty, Math.max(product.available, 1)),
          unavailable: !product.purchasable,
        };
      })
      .filter(Boolean);
    const buyable = lines.filter((l) => !l.unavailable);
    return {
      lines,
      count: buyable.reduce((n, l) => n + l.qty, 0),
      ...priceLines(buyable),
      all: lines,
    };
  }, [cart, products, sold]);
}
export const useCartCount = () =>
  useShopState().cart.reduce((n, c) => n + c.qty, 0);

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
export function removeFromCart(id) {
  set({ cart: state.cart.filter((c) => c.id !== id) });
}
export function clearCart() {
  set({ cart: [] });
}

/* ---------- wishlist ("save for later") ---------- */
export const useWishlist = () => useShopState().wishlist;
export function toggleWishlist(id) {
  const w = new Set(state.wishlist);
  if (w.has(id)) w.delete(id);
  else w.add(id);
  set({ wishlist: w });
}

/* ---------- addresses ---------- */
export const useAddresses = () => {
  const s = useShopState();
  return { addresses: s.addresses, defaultId: s.defaultAddress };
};
export function saveAddress(a) {
  const id = a.id || `ADR-${state.addresses.length + 10}`;
  const next = a.id
    ? state.addresses.map((x) => (x.id === a.id ? { ...x, ...a } : x))
    : [...state.addresses, { ...a, id }];
  set({ addresses: next });
  return id;
}
export function removeAddress(id) {
  if (state.addresses.length <= 1) return;
  const next = state.addresses.filter((a) => a.id !== id);
  set({
    addresses: next,
    defaultAddress:
      state.defaultAddress === id ? next[0].id : state.defaultAddress,
  });
}
export function setDefaultAddress(id) {
  set({ defaultAddress: id });
}

/* ---------- checkout ---------- */
export const useCheckout = () => useShopState().checkout;
export function startCheckout(lines, source = "cart") {
  set({ checkout: { lines, source } });
}
export function clearCheckout() {
  set({ checkout: null });
}

/* The lines being paid for, priced. Falls back to the cart. */
export function useCheckoutLines() {
  const products = useProducts();
  const { checkout, cart, sold } = useShopState();
  return useMemo(() => {
    const source = checkout ? checkout.lines : cart;
    const lines = source
      .map((c) => {
        const p = products.find((x) => x.id === c.id);
        if (!p) return null;
        const product = withStock(p, sold);
        return { id: c.id, product, qty: Math.min(c.qty, product.available) };
      })
      .filter((l) => l && l.product.purchasable && l.qty > 0);
    return { source: checkout?.source || "cart", ...priceLines(lines) };
  }, [checkout, cart, products, sold]);
}

/* ---------- payment (simulated) ---------- */
export const PAYMENT_METHODS = [
  { key: "UPI", label: "UPI", hint: "Google Pay, PhonePe, Paytm, BHIM" },
  {
    key: "CARD",
    label: "Credit / debit card",
    hint: "Visa, Mastercard, RuPay",
  },
  { key: "NET_BANKING", label: "Net banking", hint: "All major Indian banks" },
  {
    key: "WALLET",
    label: "ReOrbit Wallet",
    hint: `Balance ₹${WALLET_BALANCE.toLocaleString("en-IN")}`,
  },
  {
    key: "COD",
    label: "Pay on delivery",
    hint: "Cash or UPI to the delivery partner",
  },
];

/* Demo rules: a card ending in 0000 or a UPI id containing “fail”
   is declined, so the failure screen can be tried. */
function judge(method, detail, total) {
  if (method === "UPI" && /fail/i.test(detail.upi || ""))
    return "The bank declined this UPI request. Please try another UPI ID or method.";
  if (
    method === "CARD" &&
    (detail.card || "").replace(/\s/g, "").endsWith("0000")
  )
    return "Your card was declined by the bank. Please try another card or method.";
  if (method === "WALLET" && total > WALLET_BALANCE)
    return "Your wallet balance is too low for this order.";
  return null;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const digits = (n) =>
  String(Math.floor(Math.random() * 10 ** n)).padStart(n, "0");
const partyOf = (o) => ({
  type: o.role,
  id: o.id,
  name: o.name,
  sub: o.role === "ReMaker" ? `“${o.handle}”` : o.email,
  image: o.image,
  email: o.email,
  city: o.city,
  status: o.status,
  path: o.path,
});

/* Takes the money (pretend) and creates one order per listing. */
export async function payAndPlace({
  lines,
  address,
  method,
  detail = {},
  note = "",
}) {
  const quote = priceLines(lines);
  await wait(2200);
  const error = judge(method, detail, quote.total);
  if (error) return { ok: false, error };

  const created = [];
  const sold = { ...state.sold };
  let seq = state.orderSeq;
  quote.lines.forEach((l) => {
    seq += 1;
    const p = l.product;
    const placed = new Date(DEMO_TODAY.getTime() + seq * 1000);
    const paid = method !== "COD";
    const ref = paid
      ? `${method === "NET_BANKING" ? "NB" : method.slice(0, 3)}${digits(9)}`
      : null;
    const reference = method === "WALLET" ? `WAL${digits(8)}` : ref;
    const at = (ms) => new Date(placed.getTime() + ms).toISOString();
    const events = [
      {
        id: "placed",
        label: "Order placed",
        detail: `Ordered by ReOrbit Admin · “${p.title}”`,
        at: at(0),
        tone: "neutral",
      },
      paid
        ? {
            id: "payment",
            label: "Payment received",
            detail: `${method.replace("_", " ")} · ${reference}`,
            at: at(20000),
            tone: "good",
          }
        : {
            id: "payment",
            label: "Pay on delivery",
            detail: "To be collected on delivery",
            at: at(20000),
            tone: "wait",
            pending: true,
          },
      {
        id: "confirmed",
        label: "Order confirmed",
        detail: `Confirmed for ${p.owner.name}`,
        at: at(60000),
        tone: "info",
      },
    ].reverse();

    created.push({
      order_id: `ORD-${40000 + seq}`,
      order_date: placed.toISOString(),
      order_status: "Confirmed",
      cancel_reason: "",
      return_reason: "",
      seller: partyOf(p.owner),
      buyer: ADMIN_PARTY,
      flow: `${p.owner.role}>Admin`,
      listing: {
        kind: p.type,
        id: p.id,
        title: p.title,
        category: p.category,
        image: p.image,
        unit_price: p.price,
        quantity: l.qty,
        path: `/admin-products/${p.id}`,
        pickup: p.type === "item" ? p.pickup : undefined,
      },
      subtotal: l.lineSubtotal,
      platform_fee: 0,
      delivery_fee: l.fee,
      amount: l.lineTotal,
      transaction: {
        transaction_id: `TXN-9${digits(5)}`,
        payment_method: method,
        payment_status: paid ? "Success" : "Pending",
        transaction_date: paid ? at(20000) : null,
        reference,
      },
      delivery: {
        name: address.name,
        address: address.address,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        phone: address.phone,
      },
      pickup_from: {
        name: p.owner.name,
        address: `Seller pickup point, ${p.owner.city}`,
        city: p.owner.city,
        state: "",
        pincode: "—",
        phone: "—",
      },
      events,
      note,
      placed_by_admin: true,
    });
    sold[p.id] = (sold[p.id] || 0) + l.qty;
  });

  addOrders(created);
  /* take the bought listings out of the cart / checkout */
  const boughtIds = new Set(quote.lines.map((l) => l.id));
  set({
    sold,
    orderSeq: seq,
    cart: state.cart.filter((c) => !boughtIds.has(c.id)),
    checkout: null,
  });
  return {
    ok: true,
    orderIds: created.map((o) => o.order_id),
    total: quote.total,
  };
}

/* ---------- purchase history ---------- */
export function usePurchases() {
  const orders = useOrders();
  return useMemo(
    () => orders.filter((o) => o.buyer.type === "Admin"),
    [orders],
  );
}

/* Cancel a purchase: the stock goes back, and paid orders are refunded. */
export function cancelPurchase(order, reason) {
  runOrderAction(order.order_id, "cancel", reason);
  if (order.transaction.payment_status === "Success")
    runOrderAction(order.order_id, "refund");
  if (order.placed_by_admin) {
    const sold = { ...state.sold };
    sold[order.listing.id] = Math.max(
      0,
      (sold[order.listing.id] || 0) - order.listing.quantity,
    );
    set({ sold });
  }
}
export function receivePurchase(order) {
  runOrderAction(order.order_id, "complete");
}
