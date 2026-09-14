import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Store,
  Package,
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
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

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
    label: "Donations",
    path: "/user-donations",
    icon: Gift,
  },
  {
    label: "Following",
    path: "/user-following",
    icon: Users,
  },
];

const rewardMenu = [
  {
    label: "Orbit Points",
    path: "/user-orbit-points",
    icon: Star,
  },
  {
    label: "Badges",
    path: "/user-badges",
    icon: Trophy,
  },
];

const supportMenu = [
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

  const renderMenuItem = (item) => {
    const Icon = item.icon;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === "/user-dashboard"}
        className={({ isActive }) =>
          `user-sidebar-link ${isActive ? "active" : ""}`
        }
        onClick={handleNavigation}
      >
        <Icon size={18} strokeWidth={1.8} className="user-sidebar-link-icon" />

        <span className="user-sidebar-link-text">{item.label}</span>
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
