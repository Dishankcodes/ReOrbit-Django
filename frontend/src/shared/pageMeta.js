/* =========================================================
   The browser tab title and the page description, per page.

   <PageMeta /> (mounted once in App) looks up the current address in PAGES and sets:
     - document.title            "Marketplace · ReOrbit"
     - <meta name="description">  and the Open Graph / Twitter copies used by link previews
     - <link rel="canonical">
   Pages that show one thing (a product, a seller, a ReMaker) can name the tab after it:
     usePageTitle(item?.title)   ->  "Teak chair · ReOrbit"
   ========================================================= */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BRAND = "ReOrbit";
const SITE = "https://dishankcodes-reorbit.vercel.app";

const D = {
  home: "ReOrbit is a circular marketplace in Gujarat: sell what you no longer use, buy pre-loved finds, donate for free pickup and discover ReMakers who turn rescued pieces into new work.",
  market: "Browse pre-loved furniture, decor, electronics, books and one-of-a-kind ReMaker creations from people across Gujarat.",
  remakers: "Meet ReMakers: artists and makers who rescue pre-loved pieces and turn them into new, one-of-a-kind creations.",
  remakerSide: "ReOrbit for ReMakers: buy rescued material, sell your creations from your own studio page, and track orders, followers and earnings.",
  member: "Your ReOrbit account: orders, selling, donations, Orbit Points and messages.",
  studio: "Your ReOrbit studio: products, portfolio, orders, customers and earnings.",
  admin: "ReOrbit admin: manage members, ReMakers, listings, orders, donations, pickups, the warehouse and payouts.",
  policy: "ReOrbit's policies: how buying, selling, donating and your data work on ReOrbit.",
};

/* [pattern, title, description]. First match wins, so specific paths come first. */
const PAGES = [
  // ---------- public site ----------
  [/^\/$/, "Give your things a second orbit", D.home],
  [/^\/(marketplace|discover-marketplace|user-before-marketplace)$/, "Marketplace", D.market],
  [/^\/(discover-remakers|user-remakers)$/, "Discover ReMakers", D.remakers],
  [/^\/how-it-works$/, "How it works", "How ReOrbit works: list an item, get a pickup or ship it yourself, get paid after delivery, or donate for free pickup."],
  [/^\/about$/, "About us", "Why ReOrbit exists: keeping everyday things in use longer, with a marketplace, donations and ReMakers."],
  [/^\/faq$/, "FAQ", "Answers about buying, selling, payments, delivery, returns, donations and Orbit Points on ReOrbit."],
  [/^\/contact$/, "Contact us", "Get in touch with the ReOrbit team."],
  [/^\/(terms|UserTerms)$/, "Terms of use", D.policy],
  [/^\/(privacy|UserPrivacy)$/, "Privacy policy", D.policy],
  [/^\/policies\/refunds$/, "Refunds & returns", D.policy],
  [/^\/policies\/shipping$/, "Shipping & delivery", D.policy],
  [/^\/policies\/donation$/, "Donation policy", D.policy],
  [/^\/policies\/community$/, "Community guidelines", D.policy],
  [/^\/policies\//, "Policies", D.policy],
  [/^\/(auth|login)$/, "Sign in", "Sign in or create your ReOrbit account."],
  [/^\/account-blocked$/, "Account unavailable", D.member],

  // ---------- ReMaker public pages ----------
  [/^\/(remakers|remakers-home)$/, "For ReMakers", D.remakerSide],
  [/^\/remakers-about$/, "About ReMakers", D.remakerSide],
  [/^\/remakers-how-it-works$/, "How it works for ReMakers", D.remakerSide],
  [/^\/remakers-faq$/, "ReMaker FAQ", D.remakerSide],
  [/^\/remakers-contact$/, "Contact us", D.remakerSide],
  [/^\/remakers-before-marketplace$/, "Marketplace for ReMakers", D.remakerSide],
  [/^\/(remakers-auth|remakers\/join)$/, "ReMaker sign in", "Sign in or join ReOrbit as a ReMaker."],

  // ---------- member (user) app ----------
  [/^\/user-dashboard$/, "Dashboard", D.member],
  [/^\/user-marketplace\/product\//, "Product", D.market],
  [/^\/(user-marketplace|admin-shop|remaker-marketplace)\/seller\//, "Seller profile", D.market],
  [/^\/(user-marketplace|admin-shop|remaker-marketplace)\/remaker\//, "ReMaker studio", D.remakers],
  [/^\/user-marketplace$/, "Marketplace", D.market],
  [/^\/user-cart$/, "Cart", D.member],
  [/^\/user-checkout\/success\//, "Order placed", D.member],
  [/^\/user-checkout/, "Checkout", D.member],
  [/^\/user-orders\/[^/]+\/track$/, "Track order", D.member],
  [/^\/user-orders\//, "Order details", D.member],
  [/^\/user-orders$/, "My orders", D.member],
  [/^\/user-wishlist$/, "Wishlist", D.member],
  [/^\/user-sell\/new$/, "Sell an item", D.member],
  [/^\/user-sell\/sales\//, "Sale details", D.member],
  [/^\/user-sell\/sales$/, "Sales & payouts", D.member],
  [/^\/user-sell\/[^/]+\/edit$/, "Edit listing", D.member],
  [/^\/user-sell\//, "Listing details", D.member],
  [/^\/user-sell$/, "Sell on ReOrbit", D.member],
  [/^\/user-wallet$/, "Wallet", D.member],
  [/^\/user-donations\/new$/, "Donate an item", D.member],
  [/^\/user-donations\/[^/]+\/certificate$/, "Donation certificate", D.member],
  [/^\/user-donations\/history$/, "Donation history", D.member],
  [/^\/user-donations\//, "Donation details", D.member],
  [/^\/user-donations$/, "Donations", D.member],
  [/^\/user-orbit-points/, "Orbit Points", D.member],
  [/^\/user-badges/, "Badges", D.member],
  [/^\/user-reviews$/, "My reviews", D.member],
  [/^\/user-messages/, "Messages", D.member],
  [/^\/user-notifications$/, "Notifications", D.member],
  [/^\/user-following$/, "Following", D.member],
  [/^\/user-profile$/, "My profile", D.member],
  [/^\/user-addresses$/, "Saved addresses", D.member],
  [/^\/user-settings$/, "Settings", D.member],
  [/^\/user-help\/tickets\//, "Support ticket", D.member],
  [/^\/user-help\/tickets$/, "My tickets", D.member],
  [/^\/user-help\/contact$/, "Contact support", D.member],
  [/^\/user-help$/, "Help & support", D.member],

  // ---------- ReMaker studio ----------
  [/^\/remaker-dashboard$/, "Studio dashboard", D.studio],
  [/^\/remaker-marketplace\/product\//, "Product", D.market],
  [/^\/remaker-marketplace$/, "Marketplace", D.market],
  [/^\/remaker-products\/new$/, "Add product", D.studio],
  [/^\/remaker-products\/[^/]+\/edit$/, "Edit product", D.studio],
  [/^\/remaker-products/, "Products", D.studio],
  [/^\/remaker-portfolio\/new$/, "Add to portfolio", D.studio],
  [/^\/remaker-portfolio\/[^/]+\/edit$/, "Edit portfolio work", D.studio],
  [/^\/remaker-portfolio\//, "Portfolio work", D.studio],
  [/^\/remaker-portfolio$/, "Portfolio", D.studio],
  [/^\/remaker-orders\/[^/]+\/track$/, "Track order", D.studio],
  [/^\/remaker-orders/, "Purchases", D.studio],
  [/^\/remaker-sales/, "Sales", D.studio],
  [/^\/remaker-customers/, "Customers", D.studio],
  [/^\/remaker-earnings/, "Earnings", D.studio],
  [/^\/remaker-analytics$/, "Analytics", D.studio],
  [/^\/remaker-followers$/, "Followers", D.studio],
  [/^\/remaker-reviews$/, "Reviews", D.studio],
  [/^\/remaker-my-reviews$/, "My reviews", D.studio],
  [/^\/remaker-saved$/, "Saved items", D.studio],
  [/^\/remaker-cart$/, "Cart", D.studio],
  [/^\/remaker-checkout/, "Checkout", D.studio],
  [/^\/remaker-messages/, "Messages", D.studio],
  [/^\/remaker-notifications$/, "Notifications", D.studio],
  [/^\/remaker-profile$/, "Studio profile", D.studio],
  [/^\/remaker-addresses$/, "Saved addresses", D.studio],
  [/^\/remaker-settings$/, "Settings", D.studio],
  [/^\/remaker-help/, "Help & support", D.studio],

  // ---------- admin ----------
  [/^\/admin-login$/, "Admin sign in", D.admin],
  [/^\/(admin-home|admin-about|admin-how-it-works)$/, "ReOrbit admin", D.admin],
  [/^\/admin-dashboard$/, "Admin dashboard", D.admin],
  [/^\/admin-users\//, "Member details", D.admin],
  [/^\/admin-users$/, "Users", D.admin],
  [/^\/admin-remakers\//, "ReMaker details", D.admin],
  [/^\/admin-remakers$/, "ReMakers", D.admin],
  [/^\/admin-products\//, "Product details", D.admin],
  [/^\/admin-products$/, "Products", D.admin],
  [/^\/admin-orders\//, "Order details", D.admin],
  [/^\/admin-orders$/, "Orders", D.admin],
  [/^\/admin-donations\//, "Donation details", D.admin],
  [/^\/admin-donations$/, "Donations", D.admin],
  [/^\/admin-pickups\/teams$/, "Pickup teams", D.admin],
  [/^\/admin-pickups/, "Pickups", D.admin],
  [/^\/admin-warehouse\//, "Stock details", D.admin],
  [/^\/admin-warehouse$/, "Warehouse", D.admin],
  [/^\/admin-sell/, "Sell products", D.admin],
  [/^\/admin-shop\/product\//, "Product", D.admin],
  [/^\/admin-shop/, "Buy products", D.admin],
  [/^\/admin-earnings$/, "Earnings & payouts", D.admin],
  [/^\/admin-rewards$/, "Rewards", D.admin],
  [/^\/admin-reviews$/, "Reviews", D.admin],
  [/^\/admin-complaints/, "Reports", D.admin],
  [/^\/admin-support/, "Support", D.admin],
  [/^\/admin-messages/, "Messages", D.admin],
  [/^\/admin-notifications$/, "Notifications", D.admin],
  [/^\/admin-content$/, "Content", D.admin],
  [/^\/admin-testimonials$/, "Testimonials", D.admin],
  [/^\/admin-reports$/, "Reports & analytics", D.admin],
  [/^\/admin-team$/, "Team & roles", D.admin],
  [/^\/admin-system$/, "System", D.admin],
  [/^\/admin-addresses$/, "ReOrbit addresses", D.admin],
  [/^\/admin-states$/, "System status", D.admin],
  [/^\/admin-settings$/, "Settings", D.admin],
  [/^\/admin-profile$/, "My profile", D.admin],
  [/^\/admin-help$/, "Help", D.admin],
];

/* a page that shows one thing names the tab after it (set by usePageTitle) */
let override = { path: "", title: "" };

function setMeta(selector, attr, key, value) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(selector.startsWith("link") ? "link" : "meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute(selector.startsWith("link") ? "href" : "content", value);
}

export function metaFor(pathname) {
  const hit = PAGES.find(([re]) => re.test(pathname));
  return { title: hit ? hit[1] : "", description: hit ? hit[2] : D.home };
}

function apply(pathname) {
  const { title, description } = metaFor(pathname);
  const name = override.path === pathname && override.title ? override.title : title;
  const full = name && pathname !== "/" ? `${name} · ${BRAND}` : `${BRAND} — ${name || "Give your things a second orbit"}`;
  document.title = full;
  setMeta('meta[name="description"]', "name", "description", description);
  setMeta('meta[property="og:title"]', "property", "og:title", full);
  setMeta('meta[property="og:description"]', "property", "og:description", description);
  setMeta('meta[property="og:url"]', "property", "og:url", SITE + pathname);
  setMeta('meta[name="twitter:title"]', "name", "twitter:title", full);
  setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
  setMeta('link[rel="canonical"]', "rel", "canonical", SITE + pathname);
}

/* mounted once in App: keeps the tab title and description in step with the page */
export default function PageMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    apply(pathname);
  }, [pathname]);
  return null;
}

/* name the tab after what the page shows, e.g. usePageTitle(product?.title) */
export function usePageTitle(title) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!title) return undefined;
    override = { path: pathname, title };
    apply(pathname);
    return () => {
      if (override.path === pathname) override = { path: "", title: "" };
    };
  }, [title, pathname]);
}
