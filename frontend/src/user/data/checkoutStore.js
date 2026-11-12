import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { addressApi, checkoutApi } from "../../api/orders";

/* A real product id looks like LST-…, RPR-… or ADI-…; the sample items in the demo
   marketplace do not, and can't be bought. */
export const isLiveId = (id) => /^(LST|RPR|ADI)-/.test(String(id || ""));

/* ---------------------------- addresses ---------------------------- */
const toUi = (a) => ({
  id: a.id,
  label: a.label,
  name: a.name,
  phone: a.phone,
  line: [a.line1, a.line2].filter(Boolean).join(", "),
  line1: a.line1,
  line2: a.line2,
  city: a.city,
  state: a.state,
  pincode: a.pincode,
  isDefault: a.is_default,
});
const toApi = (a) => ({
  label: a.label,
  name: a.name,
  phone: a.phone,
  line1: a.line,
  city: a.city,
  pincode: a.pincode,
  is_default: !!a.isDefault,
});

let addr = { list: [], loaded: false, loading: false, error: "" };
const subs = new Set();
const setAddr = (patch) => {
  addr = { ...addr, ...patch };
  subs.forEach((l) => l());
};
const subscribe = (l) => {
  subs.add(l);
  return () => subs.delete(l);
};
const snap = () => addr;

export async function loadAddresses(force = false) {
  if (addr.loading || (addr.loaded && !force)) return;
  setAddr({ loading: true, error: "" });
  try {
    setAddr({
      list: (await addressApi.list()).map(toUi),
      loaded: true,
      loading: false,
    });
  } catch (e) {
    setAddr({
      loading: false,
      error: e.message || "Could not load your addresses.",
    });
  }
}

export function useServerAddresses() {
  const s = useSyncExternalStore(subscribe, snap, snap);
  useEffect(() => {
    loadAddresses();
  }, []);
  const def = s.list.find((a) => a.isDefault) || s.list[0];
  return {
    addresses: s.list,
    defaultId: def?.id || null,
    loading: s.loading || !s.loaded,
    error: s.error,
    reload: () => loadAddresses(true),
  };
}

export async function createAddress(values) {
  const a = toUi(await addressApi.create(toApi(values)));
  await loadAddresses(true); /* default flags may have moved */
  return a.id;
}
export async function editAddress(id, values) {
  await addressApi.update(id, toApi(values));
  await loadAddresses(true);
}
export async function deleteAddress(id) {
  await addressApi.remove(id);
  await loadAddresses(true);
}
export async function makeDefaultAddress(id) {
  await addressApi.makeDefault(id);
  await loadAddresses(true);
}
export const clearAddresses = () =>
  setAddr({ list: [], loaded: false, loading: false, error: "" });

/* ------------------------------ quote ------------------------------ */
/* Prices come from the server. Asked again only when the basket changes. */
export function useServerQuote(lines, voucherCode = "") {
  const real = lines.filter((l) => isLiveId(l.id));
  const key = real.map((l) => `${l.id}x${l.qty}`).join(",");
  const code = voucherCode || "";
  const [state, setState] = useState({
    quote: null,
    loading: real.length > 0,
    error: "",
  });
  const seq = useRef(0);

  const run = useCallback(() => {
    if (!key) {
      setState({ quote: null, loading: false, error: "" });
      return () => {};
    }
    const mine = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: "" }));
    const t = setTimeout(() => {
      checkoutApi
        .quote(
          key.split(",").map((p) => {
            const [id, qty] = p.split("x");
            return { id, qty: Number(qty) };
          }),
          code,
        )
        .then(
          (quote) =>
            mine === seq.current &&
            setState({ quote, loading: false, error: "" }),
        )
        .catch(
          (e) =>
            mine === seq.current &&
            setState({
              quote: null,
              loading: false,
              error: e.message || "Could not price your cart.",
            }),
        );
    }, 120);
    return () => clearTimeout(t);
  }, [key, code]);

  useEffect(() => run(), [run]);
  return { ...state, retry: run };
}
