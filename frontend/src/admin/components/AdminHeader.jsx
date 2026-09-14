import React, { useEffect, useRef, useState } from "react";
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  X,
  ShieldCheck,
  Command,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

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
  "/admin-notifications": {
    title: "Notifications",
    subtitle: "Manage system notifications and announcements.",
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
};

const notifications = [
  {
    id: 1,
    title: "New ReMaker application",
    message: "A new ReMaker application is waiting for review.",
    time: "12 min ago",
  },
  {
    id: 2,
    title: "New order received",
    message: "A new marketplace order has been placed.",
    time: "38 min ago",
  },
  {
    id: 3,
    title: "Pickup requires attention",
    message: "One pickup request needs assignment.",
    time: "1 hour ago",
  },
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

  const notificationRef = useRef(null);

  const profileRef = useRef(null);

  const [admin, setAdmin] = useState(() => getStoredAdmin());

  const [searchValue, setSearchValue] = useState("");

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

  const adminName = getAdminName(admin);
  const adminEmail = getAdminEmail(admin);
  const initials = getInitials(adminName);

  const currentPage = pageInformation[location.pathname] || {
    title: "ReOrbit Admin",
    subtitle: "Manage the ReOrbit ecosystem.",
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const query = searchValue.trim();

    if (!query) {
      return;
    }

    navigate(`/admin-users?search=${encodeURIComponent(query)}`);
  };

  const handleSearchClear = () => {
    setSearchValue("");
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
        <form className="admin-header-search" onSubmit={handleSearchSubmit}>
          <Search size={17} strokeWidth={1.8} />

          <input
            type="text"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search admin..."
            aria-label="Search admin"
          />

          {searchValue && (
            <button
              type="button"
              className="admin-search-clear"
              onClick={handleSearchClear}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}

          {!searchValue && (
            <span className="admin-search-shortcut">
              <Command size={11} />K
            </span>
          )}
        </form>

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

            <span className="admin-notification-count">3</span>
          </button>

          {notificationsOpen && (
            <div className="admin-dropdown admin-notification-dropdown">
              <div className="admin-dropdown-header">
                <div>
                  <strong>Notifications</strong>

                  <span>3 items need attention</span>
                </div>

                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                >
                  Mark read
                </button>
              </div>

              <div className="admin-notification-list">
                {notifications.map((notification) => (
                  <div
                    className="admin-notification-item"
                    key={notification.id}
                  >
                    <span className="admin-notification-dot" />

                    <div>
                      <strong>{notification.title}</strong>

                      <p>{notification.message}</p>

                      <span>{notification.time}</span>
                    </div>
                  </div>
                ))}
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

              <span>Administrator</span>
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

              <div className="admin-dropdown-divider" />

              <button type="button" onClick={handleProfile}>
                <User size={16} strokeWidth={1.8} />

                <span>Admin Profile</span>
              </button>

              <button type="button" onClick={handleSettings}>
                <Settings size={16} strokeWidth={1.8} />

                <span>Settings</span>
              </button>

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
