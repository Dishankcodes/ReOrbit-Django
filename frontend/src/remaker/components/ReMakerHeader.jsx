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
  Palette,
  Plus,
} from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

import "./ReMakerHeader.css";

/* =========================================================
   PAGE INFORMATION
   ========================================================= */

const pageInformation = {
  "/remaker-dashboard": {
    title: "Dashboard",
    subtitle: "Your ReMaker studio at a glance.",
  },

  "/remaker-portfolio": {
    title: "Portfolio",
    subtitle: "Showcase your work and creative journey.",
  },

  "/remaker-products": {
    title: "Products",
    subtitle: "Manage your ReMaker marketplace listings.",
  },

  "/remaker-orders": {
    title: "Orders",
    subtitle: "Track and manage your customer orders.",
  },

  "/remaker-earnings": {
    title: "Earnings",
    subtitle: "Track your sales and ReOrbit earnings.",
  },

  "/remaker-followers": {
    title: "Followers",
    subtitle: "Connect with people following your work.",
  },

  "/remaker-reviews": {
    title: "Reviews",
    subtitle: "See what customers say about your work.",
  },

  "/remaker-analytics": {
    title: "Analytics",
    subtitle: "Understand your studio performance.",
  },

  "/remaker-notifications": {
    title: "Notifications",
    subtitle: "Stay updated with your ReMaker activity.",
  },

  "/remaker-settings": {
    title: "Settings",
    subtitle: "Manage your studio and account preferences.",
  },

  "/remaker-help": {
    title: "Help & Support",
    subtitle: "Find answers and get support.",
  },

  "/remaker-profile": {
    title: "Studio Profile",
    subtitle: "Manage your ReMaker identity and profile.",
  },
};

/* =========================================================
   NOTIFICATIONS
   ========================================================= */

const notifications = [
  {
    id: 1,
    title: "New order received",
    message: "A customer placed an order for your product.",
    time: "14 min ago",
  },

  {
    id: 2,
    title: "New follower",
    message: "Someone started following your studio.",
    time: "1 hour ago",
  },

  {
    id: 3,
    title: "New review",
    message: "A customer left a new review.",
    time: "3 hours ago",
  },
];

/* =========================================================
   STORAGE
   ========================================================= */

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

/* =========================================================
   NAME
   ========================================================= */

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

/* =========================================================
   EMAIL
   ========================================================= */

function getReMakerEmail(remaker) {
  return remaker?.email || "ReMaker Studio";
}

/* =========================================================
   INITIALS
   ========================================================= */

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

/* =========================================================
   COMPONENT
   ========================================================= */

export default function ReMakerHeader({ onToggleSidebar, onCloseMobile }) {
  const location = useLocation();
  const navigate = useNavigate();

  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  const [remaker, setReMaker] = useState(() => getStoredReMaker());

  const [searchValue, setSearchValue] = useState("");

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);

  /* =========================================================
     STORAGE LISTENER
     ========================================================= */

  useEffect(() => {
    const handleStorageChange = () => {
      setReMaker(getStoredReMaker());
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  /* =========================================================
     CLOSE DROPDOWNS
     ========================================================= */

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

  /* =========================================================
     CLOSE DROPDOWNS ON ROUTE CHANGE
     ========================================================= */

  useEffect(() => {
    setNotificationsOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const remakerName = getReMakerName(remaker);

  const remakerEmail = getReMakerEmail(remaker);

  const initials = getInitials(remakerName);

  const currentPage = pageInformation[location.pathname] || {
    title: "ReMaker Studio",
    subtitle: "Create, sell and grow your work on ReOrbit.",
  };

  /* =========================================================
     SEARCH
     ========================================================= */

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const query = searchValue.trim();

    if (!query) {
      return;
    }

    navigate(`/remaker-products?search=${encodeURIComponent(query)}`);
  };

  const handleSearchClear = () => {
    setSearchValue("");
  };

  /* =========================================================
     PROFILE
     ========================================================= */

  const handleProfile = () => {
    setNotificationsOpen(false);
    setProfileOpen(false);

    navigate("/remaker-profile");

    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  /* =========================================================
     SETTINGS
     ========================================================= */

  const handleSettings = () => {
    setNotificationsOpen(false);
    setProfileOpen(false);

    navigate("/remaker-settings");

    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  /* =========================================================
     CREATE PRODUCT
     ========================================================= */

  const handleCreateProduct = () => {
    navigate("/remaker-products/new");

    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  /* =========================================================
     LOGOUT
     ========================================================= */

  const handleLogout = () => {
    localStorage.removeItem("reorbit_access_token");

    localStorage.removeItem("reorbit_refresh_token");

    localStorage.removeItem("reorbit_account_type");

    localStorage.removeItem("reorbit_remaker");

    setProfileOpen(false);
    setNotificationsOpen(false);

    navigate("/remakers-auth", {
      replace: true,
    });
  };

  return (
    <header className="remaker-header">
      {/* =====================================================
          LEFT
          ===================================================== */}

      <div className="remaker-header-left">
        <button
          type="button"
          className="remaker-header-menu"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        >
          <Menu size={19} strokeWidth={1.9} />
        </button>

        <div className="remaker-header-page-info">
          <div className="remaker-header-breadcrumb">
            <Palette size={13} strokeWidth={1.8} />

            <span>STUDIO</span>

            <span className="remaker-header-breadcrumb-separator">/</span>

            <span>{currentPage.title}</span>
          </div>

          <h1>{currentPage.title}</h1>

          <p>{currentPage.subtitle}</p>
        </div>
      </div>

      {/* =====================================================
          RIGHT
          ===================================================== */}

      <div className="remaker-header-actions">
        {/* CREATE */}

        <button
          type="button"
          className="remaker-create-button"
          onClick={handleCreateProduct}
        >
          <Plus size={15} />

          <span>Add Product</span>
        </button>

        {/* SEARCH */}

        <form className="remaker-header-search" onSubmit={handleSearchSubmit}>
          <Search size={17} strokeWidth={1.8} />

          <input
            type="text"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
          />

          {searchValue && (
            <button
              type="button"
              className="remaker-search-clear"
              onClick={handleSearchClear}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </form>

        {/* NOTIFICATIONS */}

        <div className="remaker-header-icon-wrapper" ref={notificationRef}>
          <button
            type="button"
            className={`remaker-header-icon-button ${
              notificationsOpen ? "active" : ""
            }`}
            onClick={() => {
              setNotificationsOpen((current) => !current);

              setProfileOpen(false);
            }}
            aria-label="Notifications"
          >
            <Bell size={19} strokeWidth={1.8} />

            <span className="remaker-notification-count">3</span>
          </button>

          {notificationsOpen && (
            <div className="remaker-dropdown remaker-notification-dropdown">
              <div className="remaker-dropdown-header">
                <div>
                  <strong>Notifications</strong>

                  <span>3 new updates</span>
                </div>

                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                >
                  Mark read
                </button>
              </div>

              <div className="remaker-notification-list">
                {notifications.map((notification) => (
                  <div
                    className="remaker-notification-item"
                    key={notification.id}
                  >
                    <span className="remaker-notification-dot" />

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
                className="remaker-dropdown-footer-button"
                onClick={() => {
                  setNotificationsOpen(false);

                  navigate("/remaker-notifications");
                }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>

        {/* PROFILE */}

        <div className="remaker-header-profile-wrapper" ref={profileRef}>
          <button
            type="button"
            className={`remaker-header-profile ${profileOpen ? "active" : ""}`}
            onClick={() => {
              setProfileOpen((current) => !current);

              setNotificationsOpen(false);
            }}
            aria-label="Open ReMaker profile menu"
          >
            <div className="remaker-header-avatar">{initials}</div>

            <div className="remaker-header-user-info">
              <strong>{remakerName}</strong>

              <span>ReMaker Studio</span>
            </div>

            <ChevronDown
              size={15}
              className={`remaker-profile-chevron ${
                profileOpen ? "rotated" : ""
              }`}
            />
          </button>

          {profileOpen && (
            <div className="remaker-dropdown remaker-profile-dropdown">
              <div className="remaker-profile-dropdown-user">
                <div className="remaker-profile-dropdown-avatar">
                  {initials}
                </div>

                <div>
                  <strong>{remakerName}</strong>

                  <span>{remakerEmail}</span>
                </div>
              </div>

              <div className="remaker-dropdown-divider" />

              <button type="button" onClick={handleProfile}>
                <User size={16} strokeWidth={1.8} />

                <span>Studio Profile</span>
              </button>

              <button type="button" onClick={handleSettings}>
                <Settings size={16} strokeWidth={1.8} />

                <span>Settings</span>
              </button>

              <div className="remaker-dropdown-divider" />

              <button
                type="button"
                className="remaker-profile-logout"
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
