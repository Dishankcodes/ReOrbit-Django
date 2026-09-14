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
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import "./ReMakerSidebar.css";

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

export default function ReMakerSidebar({
  collapsed = false,
  mobileOpen = false,
  onCloseMobile,
}) {
  const navigate = useNavigate();

  const [remaker, setReMaker] = useState(() => getStoredReMaker());

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

  const handleNavigation = () => {
    if (window.innerWidth <= 900 && onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleProfileClick = () => {
    navigate("/remaker-profile");

    if (window.innerWidth <= 900 && onCloseMobile) {
      onCloseMobile();
    }
  };

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
      <div className="remaker-sidebar-top">
        <div className="remaker-sidebar-brand">
          <div className="remaker-sidebar-brand-icon">
            <Palette size={21} strokeWidth={1.7} />
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

      <div className="remaker-sidebar-studio">
        <div className="remaker-sidebar-studio-icon">
          <Sparkles size={14} strokeWidth={1.7} />
        </div>

        <div>
          <span>CREATOR SPACE</span>

          <strong>Your Studio</strong>
        </div>
      </div>

      <nav className="remaker-sidebar-navigation">
        <div className="remaker-sidebar-section">
          <span className="remaker-sidebar-section-label">STUDIO</span>

          {studioMenu.map(renderMenuItem)}
        </div>

        <div className="remaker-sidebar-divider" />

        <div className="remaker-sidebar-section">
          <span className="remaker-sidebar-section-label">ORDERS</span>

          {ordersMenu.map(renderMenuItem)}
        </div>

        <div className="remaker-sidebar-divider" />

        <div className="remaker-sidebar-section">
          <span className="remaker-sidebar-section-label">COMMUNITY</span>

          {communityMenu.map(renderMenuItem)}
        </div>

        <div className="remaker-sidebar-divider" />

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
