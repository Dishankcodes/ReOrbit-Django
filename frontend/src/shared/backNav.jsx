/* =========================================================
   Back navigation, the way real apps do it.

   Every page keeps a small history of where you came from.
   "Back" returns to that page (Product → ReMaker profile → Back
   lands on the Product, not the ReMakers list). If a page was
   opened directly (a pasted link, a new tab, a refresh with no
   history), Back falls back to the page's own list instead of
   leaving the app.

   - useNavTracker()  call once, high in <App />
   - <BackLink />     replaces a fixed <Link to="/list"> back link
   - useGoBack(path)  for plain buttons that used navigate(-1)
   ========================================================= */

import {
  useLocation,
  useNavigate,
  useNavigationType,
  Link,
} from "react-router-dom";

const STORE_KEY = "reorbit_nav_stack";
const MAX = 60;

let stack = [];
let lastKey = null;

try {
  const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || "[]");
  if (Array.isArray(saved)) stack = saved;
} catch {
  /* private window: start empty */
}

const persist = () => {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(stack.slice(-MAX)));
  } catch {
    /* ignore */
  }
};

/* Runs while <App /> renders, before the page below it renders, so the
   Back link always sees the up-to-date stack. It is safe to run twice. */
export function useNavTracker() {
  const loc = useLocation();
  const type = useNavigationType();
  if (loc.key === lastKey) return;
  lastKey = loc.key;

  const entry = { key: loc.key, path: loc.pathname + loc.search };
  if (type === "PUSH") {
    stack = [...stack, entry].slice(-MAX);
  } else if (type === "REPLACE") {
    stack = stack.length ? [...stack.slice(0, -1), entry] : [entry];
  } else {
    /* POP: back / forward / reload */
    const i = stack.findIndex((e) => e.key === loc.key);
    stack = i >= 0 ? stack.slice(0, i + 1) : [entry];
  }
  persist();
}

/* ---------- names for the "Back to …" label ---------- */
const NAMES = {
  /* admin */
  "admin-dashboard": ["Dashboard"],
  "admin-users": ["Users", "User profile"],
  "admin-remakers": ["ReMakers", "ReMaker profile"],
  "admin-products": ["Products", "Product"],
  "admin-orders": ["Orders", "Order"],
  "admin-donations": ["Donations", "Donation"],
  "admin-pickups": ["Pickups", "Pickup"],
  "admin-complaints": ["Complaints", "Complaint"],
  "admin-support": ["Support"],
  "admin-messages": ["Messages", "Conversation"],
  "admin-warehouse": ["Warehouse", "Warehouse item"],
  "admin-rewards": ["Rewards"],
  "admin-sell": ["Sell products", "Listing"],
  "admin-shop": ["Shop", "Shop item"],
  "admin-earnings": ["Earnings"],
  "admin-reports": ["Reports"],
  "admin-notifications": ["Notifications"],
  "admin-content": ["Content"],
  "admin-team": ["Team"],
  "admin-settings": ["Settings"],
  "admin-addresses": ["Addresses"],
  "remaker-addresses": ["Addresses"],
  "user-addresses": ["Addresses"],
  /* user */
  "user-dashboard": ["Dashboard"],
  "user-marketplace": ["Marketplace", "Product"],
  "user-orders": ["My orders", "Order"],
  "user-cart": ["Cart"],
  "user-wishlist": ["Wishlist"],
  "user-sell": ["My listings", "Listing"],
  "user-donations": ["Donations", "Donation"],
  "user-orbit-points": ["Orbit Points"],
  "user-badges": ["Badges", "Badge"],
  "user-help": ["Help"],
  "user-settings": ["Settings"],
  /* remaker */
  "remaker-dashboard": ["Dashboard"],
  "remaker-marketplace": ["Marketplace", "Product"],
  "remaker-products": ["Products", "Product"],
  "remaker-portfolio": ["Portfolio", "Work"],
  "remaker-orders": ["My orders", "Order"],
  "remaker-sales": ["Sales", "Sale"],
  "remaker-customers": ["Customers", "Customer"],
  "remaker-messages": ["Messages", "Conversation"],
  "remaker-help": ["Help"],
  "remaker-saved": ["Saved"],
  "remaker-settings": ["Settings"],
};

export function labelForPath(path = "") {
  const clean = path.split("?")[0];
  const segs = clean.split("/").filter(Boolean);
  if (!segs.length) return "Home";
  const row = NAMES[segs[0]];
  if (row) {
    if (segs[0] === "admin-sell" && segs[1] === "sales")
      return segs.length > 2 ? "Sale" : "Sales";
    if (segs[0] === "admin-pickups" && segs[1] === "teams")
      return "Pickup teams";
    if (
      segs[0] === "user-marketplace" &&
      (segs[1] === "seller" || segs[1] === "remaker")
    )
      return segs[1] === "seller" ? "Seller" : "ReMaker";
    if (segs[0] === "remaker-marketplace" && segs[1] === "seller")
      return "Seller";
    return segs.length > 1 && row[1] ? row[1] : row[0];
  }
  const word = segs[0].replace(/^(admin|user|remaker)-/, "").replace(/-/g, " ");
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/* The page Back will return to, or null when there isn't one. */
function previous(currentPath) {
  if (stack.length < 2) return null;
  const prev = stack[stack.length - 2];
  if (!prev || prev.path.split("?")[0] === currentPath.split("?")[0])
    return null;
  return prev;
}

export function useGoBack(fallback) {
  const navigate = useNavigate();
  const loc = useLocation();
  const prev = previous(loc.pathname + loc.search);
  return {
    canGoBack: Boolean(prev),
    prevLabel: prev ? labelForPath(prev.path) : null,
    goBack: () => (prev ? navigate(-1) : navigate(fallback)),
  };
}

/* Drop-in for <Link to="/list">… List</Link> used as a back link. */
export function BackLink({ to, label, icon, className, ...rest }) {
  const navigate = useNavigate();
  const loc = useLocation();
  const prev = previous(loc.pathname + loc.search);
  const text = prev ? `Back to ${labelForPath(prev.path)}` : label;
  return (
    <Link
      to={prev ? prev.path : to}
      className={className}
      onClick={(e) => {
        if (prev && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
          e.preventDefault();
          navigate(-1);
        }
      }}
      {...rest}
    >
      {icon}
      {icon ? " " : ""}
      {text}
    </Link>
  );
}

export default BackLink;
