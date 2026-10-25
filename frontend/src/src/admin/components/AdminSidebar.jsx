import React, { useEffect, useState } from "react";
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
  Settings,
  LogOut,
  ShieldCheck,
  X,
  ChevronRight,
  CircleHelp,
  UserCog,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAccess } from "../data/teamStore";
import { useSettings } from "../data/settingsStore";
import "./AdminSidebar.css";

const mainMenu = [
  { key: "dashboard", label: "Dashboard", path: "/admin-dashboard", icon: LayoutDashboard },
  { key: "users", label: "Users", path: "/admin-users", icon: Users },
  { key: "remakers", label: "ReMakers", path: "/admin-remakers", icon: Palette },
  { key: "products", label: "Products", path: "/admin-products", icon: ShoppingBag },
  { key: "orders", label: "Orders", path: "/admin-orders", icon: Package },
  { key: "shop", label: "Buy Products", path: "/admin-shop", icon: ShoppingCart },
  { key: "sell", label: "Sell Products", path: "/admin-sell", icon: Store },
];

const operationsMenu = [
  { key: "donations", label: "Donations", path: "/admin-donations", icon: Gift },
  { key: "pickups", label: "Pickups", path: "/admin-pickups", icon: Truck },
  { key: "warehouse", label: "Warehouse", path: "/admin-warehouse", icon: Warehouse },
];

const managementMenu = [
  { key: "rewards", label: "Rewards", path: "/admin-rewards", icon: Star },
  { key: "notifications", label: "Notifications", path: "/admin-notifications", icon: Bell },
  { key: "reports", label: "Reports", path: "/admin-reports", icon: BarChart3 },
  { key: "team", label: "Team & Roles", path: "/admin-team", icon: UserCog },
];

const supportMenu = [
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
  const { profile } = useSettings();
  const adminName = access.previewing ? access.me.name : profile?.name || getAdminName(admin);
  const roleLabel = access.isSuper ? "Super admin" : access.me.roleLabel;
  const initials = getInitials(adminName);
  const visible = (list) => list.filter((item) => !item.key || access.canSee(item.key));

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
    localStorage.removeItem("reorbit_access_token");
    localStorage.removeItem("reorbit_refresh_token");
    localStorage.removeItem("reorbit_account_type");
    localStorage.removeItem("reorbit_admin");
    navigate("/admin-login", { replace: true });
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
        end={item.path === "/admin-dashboard"}
        className={({ isActive }) =>
          `admin-sidebar-link ${isActive ? "active" : ""}`
        }
        onClick={handleNavigation}
      >
        <Icon size={18} strokeWidth={1.8} className="admin-sidebar-link-icon" />
        <span className="admin-sidebar-link-text">{item.label}</span>
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
      <nav className="admin-sidebar-navigation">
        <div className="admin-sidebar-section">
          <span className="admin-sidebar-section-label">MAIN MENU</span>
          {visible(mainMenu).map(renderMenuItem)}
        </div>
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
