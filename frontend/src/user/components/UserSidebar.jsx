import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Store,
  Package,
  PackagePlus,
  ClipboardList,
  PackageSearch,
  Heart,
  Gift,
  Users,
  Star,
  Trophy,
  Settings,
  CircleHelp,
  LogOut,
  Leaf,
  X,
  ChevronRight,
  MessageCircle,
  Bell,
  UserRound,
  Palette,
  ShoppingCart,
  Ticket,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useTotalUnread } from "../data/messagesStore";
import { useNotifications } from "../data/notificationsStore";
import { useCartCount } from "../data/shopStore";

import "./UserSidebar.css";

const mainMenu = [
  {
    label: "Dashboard",
    path: "/user-dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Marketplace",
    path: "/user-marketplace",
    icon: Store,
  },
  {
    label: "My Orders",
    path: "/user-orders",
    icon: Package,
  },
  {
    label: "Wishlist",
    path: "/user-wishlist",
    icon: Heart,
  },
  {
    label: "Cart",
    path: "/user-cart",
    icon: ShoppingCart,
    badge: "cart",
  },
  {
    label: "Donations",
    path: "/user-donations",
    icon: Gift,
  },
  {
    label: "Messages",
    path: "/user-messages",
    icon: MessageCircle,
    badge: "messages",
  },
];

const communityMenu = [
  {
    label: "ReMakers",
    path: "/user-remakers",
    icon: Palette,
  },
  {
    label: "Following",
    path: "/user-following",
    icon: Users,
  },
];

const sellingMenu = [
  {
    label: "Add Product / Sell Item",
    path: "/user-sell/new",
    icon: PackagePlus,
  },
  {
    label: "My Listings",
    path: "/user-sell",
    icon: PackageSearch,
  },
  {
    label: "Selling Orders",
    path: "/user-sell/sales",
    icon: ClipboardList,
  },
];

const rewardMenu = [
  {
    label: "Orbit Points",
    path: "/user-orbit-points",
    icon: Star,
  },
  {
    label: "Rewards & Vouchers",
    path: "/user-orbit-points/vouchers",
    icon: Ticket,
  },
  {
    label: "Badges",
    path: "/user-badges",
    icon: Trophy,
  },
];

const supportMenu = [
  {
    label: "Notifications",
    path: "/user-notifications",
    icon: Bell,
    badge: "notifications",
  },
  {
    label: "My Profile",
    path: "/user-profile",
    icon: UserRound,
  },
  {
    label: "Settings",
    path: "/user-settings",
    icon: Settings,
  },
  {
    label: "Help & FAQ",
    path: "/user-help",
    icon: CircleHelp,
  },
];

function getStoredUser() {
  try {
    const storedUser = localStorage.getItem("reorbit_user");

    if (!storedUser) {
      return {};
    }

    return JSON.parse(storedUser);
  } catch {
    return {};
  }
}

function getUserName(user) {
  return user?.full_name || user?.fullName || user?.name || "ReOrbit User";
}

function getInitials(name) {
  if (!name) {
    return "RU";
  }

  const words = name.trim().split(/\s+/);

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export default function UserSidebar({
  collapsed = false,
  mobileOpen = false,
  onCloseMobile,
}) {
  const navigate = useNavigate();
  const unreadMessages = useTotalUnread();
  const unreadNotifications = useNotifications().unread;
  const cartCount = useCartCount();
  const counts = { messages: unreadMessages, notifications: unreadNotifications, cart: cartCount };

  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    const handleStorageChange = () => {
      setUser(getStoredUser());
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const userName = getUserName(user);
  const initials = getInitials(userName);

  const handleNavigation = () => {
    if (window.innerWidth <= 900 && onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleProfileClick = () => {
    navigate("/user-profile");

    if (window.innerWidth <= 900 && onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("reorbit_access_token");
    localStorage.removeItem("reorbit_refresh_token");
    localStorage.removeItem("reorbit_account_type");
    localStorage.removeItem("reorbit_user");

    navigate("/auth", { replace: true });

    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const { pathname } = useLocation();

  /* Several menu items share a path prefix (My Listings / Add Product / Selling Orders,
     Orbit Points / Rewards & Vouchers). Only the closest one is highlighted. */
  const isItemActive = (item) => {
    if (item.path === "/user-dashboard") return pathname === item.path;
    if (item.path === "/user-sell")
      return pathname === "/user-sell" || (pathname.startsWith("/user-sell/") && !/^\/user-sell\/(new|sales)/.test(pathname));
    if (item.path === "/user-sell/new") return pathname === "/user-sell/new";
    if (item.path === "/user-sell/sales") return pathname.startsWith("/user-sell/sales");
    if (item.path === "/user-orbit-points")
      return pathname.startsWith("/user-orbit-points") && !pathname.startsWith("/user-orbit-points/vouchers") && !pathname.startsWith("/user-orbit-points/rewards");
    if (item.path === "/user-orbit-points/vouchers")
      return pathname.startsWith("/user-orbit-points/vouchers") || pathname.startsWith("/user-orbit-points/rewards");
    return pathname === item.path || pathname.startsWith(item.path + "/");
  };

  const renderMenuItem = (item) => {
    const Icon = item.icon;
    const active = isItemActive(item);

    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === "/user-dashboard"}
        className={() => `user-sidebar-link ${active ? "active" : ""}`}
        aria-current={active ? "page" : undefined}
        onClick={handleNavigation}
      >
        <Icon size={18} strokeWidth={1.8} className="user-sidebar-link-icon" />

        <span className="user-sidebar-link-text">{item.label}</span>

        {counts[item.badge] > 0 && (
          <span className="user-sidebar-count" aria-label={`${counts[item.badge]} unread`}>
            {counts[item.badge] > 99 ? "99+" : counts[item.badge]}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <aside
      className={`user-sidebar ${
        collapsed ? "collapsed" : ""
      } ${mobileOpen ? "mobile-open" : ""}`}
    >
      {/* Brand */}
      <div className="user-sidebar-top">
        <div className="user-sidebar-brand">
          <div className="user-sidebar-brand-icon">
            <Leaf size={22} strokeWidth={1.8} />
          </div>

          <div className="user-sidebar-brand-text">
            <span className="user-sidebar-brand-name">ReOrbit</span>

            <span className="user-sidebar-brand-tagline">
              REUSE • RECREATE • REIMAGINE
            </span>
          </div>
        </div>

        <button
          type="button"
          className="user-sidebar-mobile-close"
          onClick={onCloseMobile}
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="user-sidebar-navigation">
        <div className="user-sidebar-section">
          <span className="user-sidebar-section-label">MAIN MENU</span>

          {mainMenu.map(renderMenuItem)}
        </div>

        <div className="user-sidebar-divider" />

        <div className="user-sidebar-section">
          <span className="user-sidebar-section-label">COMMUNITY</span>

          {communityMenu.map(renderMenuItem)}
        </div>

        <div className="user-sidebar-divider" />

        <div className="user-sidebar-section">
          <span className="user-sidebar-section-label">SELLING</span>

          {sellingMenu.map(renderMenuItem)}
        </div>

        <div className="user-sidebar-divider" />

        <div className="user-sidebar-section">
          <span className="user-sidebar-section-label">REWARDS</span>

          {rewardMenu.map(renderMenuItem)}
        </div>

        <div className="user-sidebar-divider" />

        <div className="user-sidebar-section">
          <span className="user-sidebar-section-label">SUPPORT</span>

          {supportMenu.map(renderMenuItem)}

          <button
            type="button"
            className="user-sidebar-link user-sidebar-logout"
            onClick={handleLogout}
          >
            <LogOut
              size={18}
              strokeWidth={1.8}
              className="user-sidebar-link-icon"
            />

            <span className="user-sidebar-link-text">Logout</span>
          </button>
        </div>
      </nav>

      {/* User Profile */}
      <button
        type="button"
        className="user-sidebar-profile"
        onClick={handleProfileClick}
      >
        <div className="user-sidebar-avatar">{initials}</div>

        <div className="user-sidebar-profile-info">
          <strong>{userName}</strong>
          <span>ReOrbit User</span>
        </div>

        <ChevronRight size={16} className="user-sidebar-profile-arrow" />
      </button>
    </aside>
  );
}
