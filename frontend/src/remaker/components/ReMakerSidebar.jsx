import React, { useEffect, useState } from "react";

import {
  LayoutDashboard,
  Images,
  ShoppingBag,
  Package,
  IndianRupee,
  Users,
  Star,
  BarChart3,
  Bell,
  Settings,
  CircleHelp,
  LogOut,
  Palette,
  X,
  ChevronRight,
  Sparkles,
  Store,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";

import "./ReMakerSidebar.css";

/* ====
   MARKETPLACE MENU
   ==== */

const marketplaceMenu = [
  {
    label: "Marketplace",
    path: "/remaker-marketplace",
    icon: Store,
  },
];

/* ====
   STUDIO MENU
   ==== */

const studioMenu = [
  {
    label: "Dashboard",
    path: "/remaker-dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Portfolio",
    path: "/remaker-portfolio",
    icon: Images,
  },
  {
    label: "Products",
    path: "/remaker-products",
    icon: ShoppingBag,
  },
];

/* ====
   ORDERS MENU
   ==== */

const ordersMenu = [
  {
    label: "Orders",
    path: "/remaker-orders",
    icon: Package,
  },
  {
    label: "Earnings",
    path: "/remaker-earnings",
    icon: IndianRupee,
  },
];

/* ====
   COMMUNITY MENU
   ==== */

const communityMenu = [
  {
    label: "Followers",
    path: "/remaker-followers",
    icon: Users,
  },
  {
    label: "Reviews",
    path: "/remaker-reviews",
    icon: Star,
  },
];

/* ====
   TOOLS MENU
   ==== */

const toolsMenu = [
  {
    label: "Analytics",
    path: "/remaker-analytics",
    icon: BarChart3,
  },
  {
    label: "Notifications",
    path: "/remaker-notifications",
    icon: Bell,
  },
  {
    label: "Settings",
    path: "/remaker-settings",
    icon: Settings,
  },
  {
    label: "Help & Support",
    path: "/remaker-help",
    icon: CircleHelp,
  },
];

/* ====
   STORAGE
   ==== */

function getStoredReMaker() {
  try {
    const storedReMaker = localStorage.getItem("reorbit_remaker");

    if (!storedReMaker) {
      return {};
    }

    return JSON.parse(storedReMaker);
  } catch {
    return {};
  }
}

/* ====
   NAME
   ==== */

function getReMakerName(remaker) {
  return (
    remaker?.full_name ||
    remaker?.fullName ||
    remaker?.name ||
    remaker?.business_name ||
    remaker?.businessName ||
    "ReMaker Studio"
  );
}

/* ====
   INITIALS
   ==== */

function getInitials(name) {
  if (!name) {
    return "RS";
  }

  const words = name.trim().split(/\s+/);

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/* ====
   COMPONENT
   ==== */

export default function ReMakerSidebar({
  collapsed = false,
  mobileOpen = false,
  onCloseMobile,
}) {
  const navigate = useNavigate();

  const [remaker, setReMaker] = useState(() => getStoredReMaker());

  /* ====
     STORAGE LISTENER
     ==== */

  useEffect(() => {
    const handleStorageChange = () => {
      setReMaker(getStoredReMaker());
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const remakerName = getReMakerName(remaker);
  const initials = getInitials(remakerName);

  /* ====
     NAVIGATION
     ==== */

  const handleNavigation = () => {
    if (window.innerWidth <= 900 && onCloseMobile) {
      onCloseMobile();
    }
  };

  /* ====
     PROFILE
     ==== */

  const handleProfileClick = () => {
    navigate("/remaker-profile");

    if (window.innerWidth <= 900 && onCloseMobile) {
      onCloseMobile();
    }
  };

  /* ====
     LOGOUT
     ==== */

  const handleLogout = () => {
    localStorage.removeItem("reorbit_access_token");

    localStorage.removeItem("reorbit_refresh_token");

    localStorage.removeItem("reorbit_account_type");

    localStorage.removeItem("reorbit_remaker");

    navigate("/remakers-auth", {
      replace: true,
    });

    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  /* ====
     MENU ITEM
     ==== */

  const renderMenuItem = (item) => {
    const Icon = item.icon;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === "/remaker-dashboard"}
        className={({ isActive }) =>
          `remaker-sidebar-link ${isActive ? "active" : ""}`
        }
        onClick={handleNavigation}
      >
        <Icon
          size={18}
          strokeWidth={1.8}
          className="remaker-sidebar-link-icon"
        />

        <span className="remaker-sidebar-link-text">{item.label}</span>
      </NavLink>
    );
  };

  return (
    <aside
      className={`remaker-sidebar ${collapsed ? "collapsed" : ""} ${
        mobileOpen ? "mobile-open" : ""
      }`}
    >
      {/* 
          BRAND
           */}

      <div className="remaker-sidebar-top">
        <div className="remaker-sidebar-brand">
          <div className="remaker-sidebar-brand-icon">
            <Palette size={22} strokeWidth={1.8} />
          </div>

          <div className="remaker-sidebar-brand-text">
            <span className="remaker-sidebar-brand-name">ReOrbit</span>

            <span className="remaker-sidebar-brand-tagline">
              REMAKER STUDIO
            </span>
          </div>
        </div>

        <button
          type="button"
          className="remaker-sidebar-mobile-close"
          onClick={onCloseMobile}
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>

     

      {/* 
          NAVIGATION
           */}

      <nav className="remaker-sidebar-navigation">
        {/* MARKETPLACE */}

        <div className="remaker-sidebar-section">
          <span className="remaker-sidebar-section-label">MARKETPLACE</span>

          {marketplaceMenu.map(renderMenuItem)}
        </div>

        <div className="remaker-sidebar-divider" />

        {/* STUDIO */}

        <div className="remaker-sidebar-section">
          <span className="remaker-sidebar-section-label">STUDIO</span>

          {studioMenu.map(renderMenuItem)}
        </div>

        <div className="remaker-sidebar-divider" />

        {/* ORDERS */}

        <div className="remaker-sidebar-section">
          <span className="remaker-sidebar-section-label">ORDERS</span>

          {ordersMenu.map(renderMenuItem)}
        </div>

        <div className="remaker-sidebar-divider" />

        {/* COMMUNITY */}

        <div className="remaker-sidebar-section">
          <span className="remaker-sidebar-section-label">COMMUNITY</span>

          {communityMenu.map(renderMenuItem)}
        </div>

        <div className="remaker-sidebar-divider" />

        {/* TOOLS */}

        <div className="remaker-sidebar-section">
          <span className="remaker-sidebar-section-label">TOOLS</span>

          {toolsMenu.map(renderMenuItem)}

          <button
            type="button"
            className="remaker-sidebar-link remaker-sidebar-logout"
            onClick={handleLogout}
          >
            <LogOut
              size={18}
              strokeWidth={1.8}
              className="remaker-sidebar-link-icon"
            />

            <span className="remaker-sidebar-link-text">Logout</span>
          </button>
        </div>
      </nav>

      {/* 
          PROFILE
           */}

      <button
        type="button"
        className="remaker-sidebar-profile"
        onClick={handleProfileClick}
      >
        <div className="remaker-sidebar-avatar">{initials}</div>

        <div className="remaker-sidebar-profile-info">
          <strong>{remakerName}</strong>

          <span>ReMaker</span>
        </div>

        <ChevronRight size={16} className="remaker-sidebar-profile-arrow" />
      </button>
    </aside>
  );
}
