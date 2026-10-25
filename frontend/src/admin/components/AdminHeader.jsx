import React, { useEffect, useRef, useState } from "react";
import {
  Menu,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  ShieldCheck,
  UserCog,
  Eye,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useNotifications, markRead, MODULES, timeAgo } from "../data/notificationsStore";
import { useAccess } from "../data/teamStore";
import { useSettings } from "../data/settingsStore";

import "./AdminHeader.css";

const pageInformation = {
  "/admin-dashboard": {
    title: "Dashboard",
    subtitle: "Monitor the ReOrbit ecosystem from one place.",
  },
  "/admin-users": {
    title: "Users",
    subtitle: "Manage ReOrbit users and account activity.",
  },
  "/admin-remakers": {
    title: "ReMakers",
    subtitle: "Review and manage the ReMaker community.",
  },
  "/admin-products": {
    title: "Products",
    subtitle: "Manage marketplace products and listings.",
  },
  "/admin-orders": {
    title: "Orders",
    subtitle: "Track and manage customer orders.",
  },
  "/admin-donations": {
    title: "Donations",
    subtitle: "Manage donated items and donation activity.",
  },
  "/admin-pickups": {
    title: "Pickups",
    subtitle: "Manage pickup requests and schedules.",
  },
  "/admin-warehouse": {
    title: "Warehouse",
    subtitle: "Monitor inventory and refurbishment operations.",
  },
  "/admin-rewards": {
    title: "Rewards",
    subtitle: "Manage Orbit Points, badges and rewards.",
  },
  "/admin-sell": { title: "Sell Products", subtitle: "List warehouse and refurbished products and manage their sales." },
  "/admin-sell/new": { title: "Add Product", subtitle: "Enter the details, add 3 to 4 photos and publish." },
  "/admin-sell/sales": { title: "Sales", subtitle: "Orders placed for your products. Accept, ship and track them." },
  "/admin-shop": { title: "Buy Products", subtitle: "Shop community items and ReMaker products as the platform." },
  "/admin-shop/cart": { title: "Cart", subtitle: "Review the products you are about to buy." },
  "/admin-shop/checkout": { title: "Checkout", subtitle: "Delivery, payment and review." },
  "/admin-shop/orders": { title: "My Purchases", subtitle: "Everything you bought as the platform." },
  "/admin-notifications": {
    title: "Notifications",
    subtitle: "Manage system notifications and announcements.",
  },
  "/admin-earnings": {
    title: "Earnings",
    subtitle: "Platform fees, product sales and where the money goes.",
  },
  "/admin-reports": {
    title: "Reports",
    subtitle: "Review ReOrbit performance and analytics.",
  },
  "/admin-settings": {
    title: "Settings",
    subtitle: "Manage administration and platform settings.",
  },
  "/admin-help": {
    title: "Help & Support",
    subtitle: "Find help and manage support resources.",
  },
  "/admin-profile": {
    title: "Admin Profile",
    subtitle: "View and manage your administrator profile.",
  },
  "/admin-team": {
    title: "Team & Roles",
    subtitle: "Add sub-admins and choose what each person can see and change.",
  },
};


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

function getAdminEmail(admin) {
  return admin?.email || "Administrator";
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

export default function AdminHeader({ onToggleSidebar, onCloseMobile }) {
  const location = useLocation();
  const navigate = useNavigate();

  const inbox = useNotifications();
  const unreadItems = inbox.filter((n) => !n.read);
  const bellCount = unreadItems.length;
  const bellList = (unreadItems.length ? unreadItems : inbox).slice(0, 6);
  const notificationRef = useRef(null);

  const profileRef = useRef(null);

  const [admin, setAdmin] = useState(() => getStoredAdmin());

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setAdmin(getStoredAdmin());
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    setNotificationsOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const access = useAccess();
  const { profile } = useSettings();
  const person = access.me;
  const adminName = access.previewing ? person.name : profile?.name || getAdminName(admin);
  const adminEmail = access.previewing ? person.email : profile?.email || getAdminEmail(admin);
  const roleLabel = access.isSuper ? "Super admin" : person.roleLabel;
  const initials = getInitials(adminName);

  /* A single user's page (/admin-users/USR-1001) gets its own title. */
  const isUserProfilePage = /^\/admin-users\/[^/]+$/.test(location.pathname);

  const isRemakerProfilePage = /^\/admin-remakers\/[^/]+$/.test(location.pathname);

  const isProductDetailsPage = /^\/admin-products\/[^/]+$/.test(location.pathname);

  const isOrderDetailsPage = /^\/admin-orders\/[^/]+$/.test(location.pathname);

  const isPickupDetailsPage = /^\/admin-pickups\/[^/]+$/.test(location.pathname);

  const isDonationDetailsPage = /^\/admin-donations\/[^/]+$/.test(location.pathname);

  const isWarehouseItemPage = /^\/admin-warehouse\/[^/]+$/.test(location.pathname);

  const isShopProductPage = /^\/admin-shop\/product\/[^/]+$/.test(location.pathname);
  const isShopSellerPage = /^\/admin-shop\/seller\/[^/]+$/.test(location.pathname);
  const isShopSuccessPage = /^\/admin-shop\/success\/[^/]+$/.test(location.pathname);
  const isShopOrderPage = /^\/admin-shop\/orders\/[^/]+$/.test(location.pathname);

  const isSellListingPage = /^\/admin-sell\/listing\/[^/]+$/.test(location.pathname);
  const isSellEditPage = /^\/admin-sell\/edit\/[^/]+$/.test(location.pathname);
  const isSaleDetailsPage = /^\/admin-sell\/sales\/[^/]+$/.test(location.pathname);

  const currentPage = isSellListingPage
    ? { title: "Listing Details", subtitle: "Photos, stock, performance and the sales of this product." }
    : isSellEditPage
    ? { title: "Edit Product", subtitle: "Update the details, photos and price." }
    : isSaleDetailsPage
    ? { title: "Sale Details", subtitle: "Buyer, shipping, payment and status of this selling order." }
    : isShopProductPage
    ? { title: "Product", subtitle: "Details, seller profile and buying options." }
    : isShopSellerPage
    ? { title: "Seller Shop", subtitle: "Everything this seller has listed." }
    : isShopSuccessPage
    ? { title: "Order Placed", subtitle: "Your order is confirmed." }
    : isShopOrderPage
    ? { title: "Purchase Details", subtitle: "Tracking, payment and delivery for this purchase." }
    : isPickupDetailsPage
    ? {
        title: "Pickup Details",
        subtitle: "Schedule, pickup team, address and history for this pickup.",
      }
    : isDonationDetailsPage
    ? {
        title: "Donation Details",
        subtitle: "Review the donor, the item and the pickup progress.",
      }
    : isWarehouseItemPage
    ? {
        title: "Stock Details",
        subtitle: "Location, sales performance and actions for this stock.",
      }
    : isOrderDetailsPage
    ? {
        title: "Order Details",
        subtitle: "Payment, buyer, seller and the history of this order.",
      }
    : isProductDetailsPage
    ? {
        title: "Product Details",
        subtitle: "Review the listing, who posted it and its history.",
      }
    : isRemakerProfilePage
    ? {
        title: "ReMaker Profile",
        subtitle: "Portfolio, products, orders, refurbishments and moderation.",
      }
    : isUserProfilePage
    ? {
        title: "User Profile",
        subtitle: "Account details, orders, donations and moderation.",
      }
    : pageInformation[location.pathname] || {
        title: "ReOrbit Admin",
        subtitle: "Manage the ReOrbit ecosystem.",
      };

  const handleProfile = () => {
    setNotificationsOpen(false);
    setProfileOpen(false);

    navigate("/admin-profile");

    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleSettings = () => {
    setNotificationsOpen(false);
    setProfileOpen(false);

    navigate("/admin-settings");

    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("reorbit_access_token");

    localStorage.removeItem("reorbit_refresh_token");

    localStorage.removeItem("reorbit_account_type");

    localStorage.removeItem("reorbit_admin");

    setProfileOpen(false);
    setNotificationsOpen(false);

    navigate("/admin-login", {
      replace: true,
    });
  };

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <button
          type="button"
          className="admin-header-menu"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        >
          <Menu size={19} strokeWidth={1.9} />
        </button>

        <div className="admin-header-page-info">
          <div className="admin-header-breadcrumb">
            <ShieldCheck size={13} strokeWidth={1.8} />

            <span>ADMIN</span>

            <span className="admin-header-breadcrumb-separator">/</span>

            <span>{currentPage.title}</span>
          </div>

          <h1>{currentPage.title}</h1>

          <p>{currentPage.subtitle}</p>
        </div>
      </div>

      <div className="admin-header-actions">
        {access.previewing && (
          <span className="admin-header-preview-chip" title="You are previewing the panel as this person">
            <Eye size={14} />
            Preview
          </span>
        )}

        <div className="admin-header-icon-wrapper" ref={notificationRef}>
          <button
            type="button"
            className={`admin-header-icon-button ${
              notificationsOpen ? "active" : ""
            }`}
            onClick={() => {
              setNotificationsOpen((current) => !current);

              setProfileOpen(false);
            }}
            aria-label="Notifications"
          >
            <Bell size={19} strokeWidth={1.8} />

            {bellCount > 0 && <span className="admin-notification-count">{bellCount > 99 ? "99+" : bellCount}</span>}
          </button>

          {notificationsOpen && (
            <div className="admin-dropdown admin-notification-dropdown">
              <div className="admin-dropdown-header">
                <div>
                  <strong>Notifications</strong>

                  <span>{bellCount ? `${bellCount} unread` : "No unread notifications"}</span>
                </div>

                <button
                  type="button"
                  onClick={() => markRead(unreadItems.map((n) => n.id))}
                >
                  Mark read
                </button>
              </div>

              <div className="admin-notification-list">
                {bellList.map((n) => (
                  <button
                    type="button"
                    className={`admin-notification-item admin-notification-warehouse ${n.read ? "is-read" : ""}`}
                    key={n.id}
                    onClick={() => {
                      markRead([n.id]);
                      setNotificationsOpen(false);
                      if (n.path) navigate(n.path);
                    }}
                  >
                    <span className={`admin-notification-dot sev-${n.severity}`} />
                    <div>
                      <strong>{n.title}</strong>
                      <p>{n.message}</p>
                      <span>{MODULES[n.module].label} · {timeAgo(n.at)}</span>
                    </div>
                  </button>
                ))}
                {bellList.length === 0 && (
                  <div className="admin-notification-item"><div><strong>All caught up</strong><p>No notifications right now.</p></div></div>
                )}
              </div>

              <button
                type="button"
                className="admin-dropdown-footer-button"
                onClick={() => {
                  setNotificationsOpen(false);

                  navigate("/admin-notifications");
                }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>

        <div className="admin-header-profile-wrapper" ref={profileRef}>
          <button
            type="button"
            className={`admin-header-profile ${profileOpen ? "active" : ""}`}
            onClick={() => {
              setProfileOpen((current) => !current);

              setNotificationsOpen(false);
            }}
            aria-label="Open admin profile menu"
          >
            <div className="admin-header-avatar">{initials}</div>

            <div className="admin-header-user-info">
              <strong>{adminName}</strong>

              <span>{roleLabel}</span>
            </div>

            <ChevronDown
              size={15}
              className={`admin-profile-chevron ${
                profileOpen ? "rotated" : ""
              }`}
            />
          </button>

          {profileOpen && (
            <div className="admin-dropdown admin-profile-dropdown">
              <div className="admin-profile-dropdown-user">
                <div className="admin-profile-dropdown-avatar">{initials}</div>

                <div>
                  <strong>{adminName}</strong>

                  <span>{adminEmail}</span>
                </div>
              </div>

              <div className="admin-profile-dropdown-role">
                <ShieldCheck size={13} />
                {roleLabel}
              </div>

              <div className="admin-dropdown-divider" />

              <button type="button" onClick={handleProfile}>
                <User size={16} strokeWidth={1.8} />

                <span>Admin Profile</span>
              </button>

              <button type="button" onClick={handleSettings}>
                <Settings size={16} strokeWidth={1.8} />

                <span>Settings</span>
              </button>

              {access.isSuper && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/admin-team");
                  }}
                >
                  <UserCog size={16} strokeWidth={1.8} />

                  <span>Team & Roles</span>
                </button>
              )}

              <div className="admin-dropdown-divider" />

              <button
                type="button"
                className="admin-profile-logout"
                onClick={handleLogout}
              >
                <LogOut size={16} strokeWidth={1.8} />

                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
