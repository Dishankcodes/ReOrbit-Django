import React, { useEffect, useRef, useState } from "react";
import { signOut } from "../../api/auth";
import {
  LayoutDashboard,
  Users,
  Palette,
  ShoppingBag,
  Package,
  ShoppingCart,
  Store,
  Gift,
  Truck,
  Warehouse,
  Star,
  Bell,
  BarChart3,
  MapPin,
  Settings,
  LogOut,
  ShieldCheck,
  X,
  ChevronRight,
  CircleHelp,
  UserCog,
  Wallet,
  ShieldAlert,
  LifeBuoy,
  LayoutTemplate,
  Heart,
  MessageSquareText,
  Search,
  History,
  ReceiptText,
  BadgeIndianRupee,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAccess } from "../data/teamStore";
import { useSettings } from "../data/settingsStore";
import { useComplaintCounts } from "../data/complaintsStore";
import { useTotalUnread as useUnreadMessages } from "../../user/data/messagesStore";
import { useSupportStatus, useSupportTickets } from "../../shared/supportTickets";
import "./AdminSidebar.css";

const mainMenu = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/admin-dashboard",
    icon: LayoutDashboard,
  },
  { key: "users", label: "Users", path: "/admin-users", icon: Users },
  {
    key: "remakers",
    label: "ReMakers",
    path: "/admin-remakers",
    icon: Palette,
  },
  {
    key: "products",
    label: "Products",
    path: "/admin-products",
    icon: ShoppingBag,
  },
  {
    key: "orders",
    label: "Orders",
    path: "/admin-orders",
    icon: Package,
    words: "all orders platform payments refunds",
  },
];

/* What the signed-in admin buys and sells as the platform. */
const shoppingMenu = [
  {
    key: "shop",
    label: "Buy Products",
    path: "/admin-shop",
    icon: ShoppingCart,
    words: "shop marketplace buy",
  },
  {
    key: "shop",
    label: "Saved Items",
    path: "/admin-shop/wishlist",
    icon: Heart,
    words: "wishlist favourites",
  },
  {
    key: "shop",
    label: "My Cart",
    path: "/admin-shop/cart",
    icon: ShoppingCart,
    words: "cart basket checkout",
  },
  {
    key: "shop",
    label: "My Orders",
    path: "/admin-shop/orders",
    icon: ReceiptText,
    words: "my order history purchases bought track",
  },
  {
    key: "shop",
    label: "My Reviews",
    path: "/admin-shop/reviews",
    icon: Star,
    words: "ratings feedback rate order reviews i wrote",
  },
];

const sellingMenu = [
  {
    key: "sell",
    label: "Sell Products",
    path: "/admin-sell",
    icon: Store,
    words: "sell list stock listings",
  },
  {
    key: "sell",
    label: "My Sales",
    path: "/admin-sell/sales",
    icon: BadgeIndianRupee,
    words: "sold sales orders received",
  },
];

const operationsMenu = [
  {
    key: "donations",
    label: "Donations",
    path: "/admin-donations",
    icon: Gift,
  },
  { key: "pickups", label: "Pickups", path: "/admin-pickups", icon: Truck },
  {
    key: "complaints",
    label: "Complaints",
    path: "/admin-complaints",
    icon: ShieldAlert,
  },
  {
    key: "complaints",
    label: "Reviews",
    path: "/admin-reviews",
    icon: MessageSquareText,
  },
  { key: "support", label: "Support", path: "/admin-support", icon: LifeBuoy },
  { key: "messages", label: "Messages", path: "/admin-messages", icon: MessageSquareText },
  {
    key: "warehouse",
    label: "Warehouse",
    path: "/admin-warehouse",
    icon: Warehouse,
  },
];

const managementMenu = [
  { key: "rewards", label: "Rewards", path: "/admin-rewards", icon: Star },
  {
    key: "notifications",
    label: "Notifications",
    path: "/admin-notifications",
    icon: Bell,
  },
  {
    key: "content",
    label: "Content",
    path: "/admin-content",
    icon: LayoutTemplate,
  },
  { key: "earnings", label: "Earnings", path: "/admin-earnings", icon: Wallet },
  { key: "reports", label: "Reports", path: "/admin-reports", icon: BarChart3 },
  { key: "team", label: "Team & Roles", path: "/admin-team", icon: UserCog },
];

const supportMenu = [
  { label: "Addresses", path: "/admin-addresses", icon: MapPin },
  { label: "Settings", path: "/admin-settings", icon: Settings },
  { label: "Help & Support", path: "/admin-help", icon: CircleHelp },
];

function getStoredAdmin() {
  try {
    const storedAdmin = localStorage.getItem("reorbit_admin");
    if (!storedAdmin) {
      return {};
    }
    return JSON.parse(storedAdmin);
  } catch {
    return {};
  }
}

function getAdminName(admin) {
  return admin?.full_name || admin?.fullName || admin?.name || "ReOrbit Admin";
}

function getInitials(name) {
  if (!name) {
    return "RA";
  }
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export default function AdminSidebar({
  collapsed = false,
  mobileOpen = false,
  onCloseMobile,
}) {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(() => getStoredAdmin());

  useEffect(() => {
    const handleStorageChange = () => {
      setAdmin(getStoredAdmin());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const access = useAccess();
  const complaintCounts = useComplaintCounts();
  const unreadMessages = useUnreadMessages(access.canSee("messages"));
  useSupportTickets("admin", {}, access.canSee("support"));
  const supportStatus = useSupportStatus("admin");
  const unreadSupportTickets = supportStatus.unreadCount || 0;
  const { profile } = useSettings();
  const adminName = access.previewing
    ? access.me.name
    : profile?.name || getAdminName(admin);
  const roleLabel = access.isSuper ? "Super admin" : access.me.roleLabel;
  const initials = getInitials(adminName);
  const visible = (list) =>
    list.filter((item) => !item.key || access.canSee(item.key));

  const handleNavigation = () => {
    if (window.innerWidth <= 900 && onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleProfileClick = () => {
    navigate("/admin-profile");
    if (window.innerWidth <= 900 && onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleLogout = () => {
    signOut();

    navigate("/admin-login", { replace: true });
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const { pathname } = useLocation();
  /* Pages that share a prefix (/admin-shop/orders is under /admin-shop) light up only their own link. */
  const SUB = {
    "/admin-shop": ["/admin-shop/wishlist", "/admin-shop/cart", "/admin-shop/checkout", "/admin-shop/orders", "/admin-shop/reviews"],
    "/admin-sell": ["/admin-sell/sales"],
  };
  const isActive = (path) => {
    if (path === "/admin-dashboard") return pathname === path;
    if (SUB[path]?.some((p) => pathname === p || pathname.startsWith(p + "/")))
      return false;
    if (path === "/admin-shop/cart")
      return pathname.startsWith("/admin-shop/cart") || pathname.startsWith("/admin-shop/checkout");
    return pathname === path || pathname.startsWith(path + "/");
  };

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const searchRef = useRef(null);
  const RECENT_KEY = "reorbit_admin_recent";
  const readRecent = () => {
    try {
      const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  };
  const [recent, setRecent] = useState(readRecent);

  /* "/" jumps to the menu search from anywhere, unless you are typing somewhere. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      const typing =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable);
      if (typing) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const allItems = [
    ...mainMenu,
    ...shoppingMenu,
    ...sellingMenu,
    ...operationsMenu,
    ...managementMenu,
    ...supportMenu,
  ];
  /* remember the last few menu pages you opened */
  useEffect(() => {
    const hit = allItems
      .filter((i) => pathname === i.path || pathname.startsWith(i.path + "/"))
      .sort((a, b) => b.path.length - a.path.length)[0];
    if (!hit) return;
    setRecent((prev) => {
      const next = [hit.path, ...prev.filter((p) => p !== hit.path)].slice(0, 6);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* private mode: the list just won't persist */
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  const recentItems = recent
    .filter((p) => p !== pathname)
    .map((p) => visible(allItems).find((i) => i.path === p))
    .filter(Boolean)
    .slice(0, 4);
  const q = query.trim().toLowerCase();
  const results = q
    ? visible(allItems).filter((i) =>
        `${i.label} ${i.words || ""}`.toLowerCase().includes(q),
      )
    : [];
  const goFirst = (e) => {
    if (e.key === "Escape") setQuery("");
    if (e.key === "Enter" && results[0]) {
      navigate(results[0].path);
      setQuery("");
      handleNavigation();
    }
  };

  const renderMenuItem = (item) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === "/admin-dashboard"}
        className={() => `admin-sidebar-link ${isActive(item.path) ? "active" : ""}`}
        onClick={() => {
          setQuery("");
          handleNavigation();
        }}
      >
        <Icon size={18} strokeWidth={1.8} className="admin-sidebar-link-icon" />
        <span className="admin-sidebar-link-text">{item.label}</span>
        {item.key === "support" && unreadSupportTickets > 0 && (
          <span
            className="admin-sidebar-count"
            aria-label={`${unreadSupportTickets} unread support tickets`}
          >
            {unreadSupportTickets > 99 ? "99+" : unreadSupportTickets}
          </span>
        )}
        {item.key === "messages" && unreadMessages > 0 && (
          <span
            className="admin-sidebar-count"
            aria-label={`${unreadMessages} unread messages`}
          >
            {unreadMessages > 99 ? "99+" : unreadMessages}
          </span>
        )}
        {item.path === "/admin-complaints" && complaintCounts.open > 0 && (
          <span
            className="admin-sidebar-count"
            aria-label={`${complaintCounts.open} open`}
          >
            {complaintCounts.open}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <aside
      className={`admin-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
    >
      <div className="admin-sidebar-top">
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-brand-icon">
            <ShieldCheck size={22} strokeWidth={1.8} />
          </div>
          <div className="admin-sidebar-brand-text">
            <span className="admin-sidebar-brand-name">ReOrbit</span>
            <span className="admin-sidebar-brand-tagline">ADMINISTRATION</span>
          </div>
        </div>
        <button
          type="button"
          className="admin-sidebar-mobile-close"
          onClick={onCloseMobile}
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>
      <div className="admin-sidebar-search">
        <Search size={15} aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={goFirst}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search menu…"
          aria-label="Search the menu"
        />
        {!query && !focused && <kbd className="admin-sidebar-search-key">/</kbd>}
        {focused && !query && recentItems.length > 0 && (
          <div className="admin-sidebar-recent" role="listbox" aria-label="Recent pages">
            <span className="admin-sidebar-section-label">
              <History size={11} /> RECENT
            </span>
            {recentItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.path}
                  className="admin-sidebar-recent-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    navigate(item.path);
                    searchRef.current?.blur();
                    handleNavigation();
                  }}
                >
                  <Icon size={15} strokeWidth={1.8} />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <nav className="admin-sidebar-navigation">
        {q ? (
          <div className="admin-sidebar-section">
            <span className="admin-sidebar-section-label">
              {results.length ? "RESULTS" : "NO MATCHES"}
            </span>
            {results.map(renderMenuItem)}
          </div>
        ) : (
          <>
        <div className="admin-sidebar-section">
          <span className="admin-sidebar-section-label">MAIN MENU</span>
          {visible(mainMenu).map(renderMenuItem)}
        </div>
        {visible(shoppingMenu).length > 0 && (
          <>
            <div className="admin-sidebar-divider" />
            <div className="admin-sidebar-section">
              <span className="admin-sidebar-section-label">MY SHOPPING</span>
              {visible(shoppingMenu).map(renderMenuItem)}
            </div>
          </>
        )}
        {visible(sellingMenu).length > 0 && (
          <>
            <div className="admin-sidebar-divider" />
            <div className="admin-sidebar-section">
              <span className="admin-sidebar-section-label">MY SELLING</span>
              {visible(sellingMenu).map(renderMenuItem)}
            </div>
          </>
        )}
        {visible(operationsMenu).length > 0 && (
          <>
            <div className="admin-sidebar-divider" />
            <div className="admin-sidebar-section">
              <span className="admin-sidebar-section-label">OPERATIONS</span>
              {visible(operationsMenu).map(renderMenuItem)}
            </div>
          </>
        )}
        {visible(managementMenu).length > 0 && (
          <>
            <div className="admin-sidebar-divider" />
            <div className="admin-sidebar-section">
              <span className="admin-sidebar-section-label">MANAGEMENT</span>
              {visible(managementMenu).map(renderMenuItem)}
            </div>
          </>
        )}
        <div className="admin-sidebar-divider" />
        <div className="admin-sidebar-section">
          <span className="admin-sidebar-section-label">SUPPORT</span>
          {supportMenu.map(renderMenuItem)}
          <button
            type="button"
            className="admin-sidebar-link admin-sidebar-logout"
            onClick={handleLogout}
          >
            <LogOut
              size={18}
              strokeWidth={1.8}
              className="admin-sidebar-link-icon"
            />
            <span className="admin-sidebar-link-text">Logout</span>
          </button>
        </div>
          </>
        )}
      </nav>
      <button
        type="button"
        className="admin-sidebar-profile"
        onClick={handleProfileClick}
      >
        <div className="admin-sidebar-avatar">{initials}</div>
        <div className="admin-sidebar-profile-info">
          <strong>{adminName}</strong>
          <span>{roleLabel}</span>
        </div>
        <ChevronRight size={16} className="admin-sidebar-profile-arrow" />
      </button>
    </aside>
  );
}
