import React, { useEffect, useRef, useState } from "react";
import {
  Menu,
  Search,
  Bell,
  Heart,
  ChevronDown,
  User,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import "./UserHeader.css";

const pageInformation = {
  "/user-dashboard": {
    title: "Dashboard",
    subtitle: "Your ReOrbit journey at a glance.",
  },

  "/user-marketplace": {
    title: "Marketplace",
    subtitle: "Discover products ready for their next orbit.",
  },

  "/user-orders": {
    title: "My Orders",
    subtitle: "Track and manage your ReOrbit purchases.",
  },

  "/user-wishlist": {
    title: "Wishlist",
    subtitle: "Products you want to keep in your orbit.",
  },

  "/user-donations": {
    title: "Donations",
    subtitle: "Give useful items another meaningful life.",
  },

  "/user-following": {
    title: "Following",
    subtitle: "Creators and ReMakers you're following.",
  },

  "/user-orbit-points": {
    title: "Orbit Points",
    subtitle: "Your sustainability rewards and progress.",
  },

  "/user-badges": {
    title: "Badges",
    subtitle: "Milestones you've earned on ReOrbit.",
  },

  "/user-settings": {
    title: "Settings",
    subtitle: "Manage your account and preferences.",
  },

  "/user-help": {
    title: "Help & FAQ",
    subtitle: "Find answers and get help with ReOrbit.",
  },

  "/user-profile": {
    title: "My Profile",
    subtitle: "View and manage your ReOrbit profile.",
  },
};

const notifications = [
  {
    id: 1,
    title: "Order update",
    message: "Your recent order has been confirmed.",
    time: "10 min ago",
  },
  {
    id: 2,
    title: "New reward",
    message: "You've earned new Orbit Points.",
    time: "1 hour ago",
  },
  {
    id: 3,
    title: "Wishlist reminder",
    message: "One of your saved items is still available.",
    time: "3 hours ago",
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

function getUserEmail(user) {
  return user?.email || "ReOrbit User";
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

export default function UserHeader({ onToggleSidebar, onCloseMobile }) {
  const location = useLocation();
  const navigate = useNavigate();

  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  const [user, setUser] = useState(() => getStoredUser());

  const [searchValue, setSearchValue] = useState("");

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setUser(getStoredUser());
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

  const userName = getUserName(user);
  const userEmail = getUserEmail(user);
  const initials = getInitials(userName);

  const currentPage = pageInformation[location.pathname] || {
    title: "ReOrbit",
    subtitle: "Reuse, recreate and reimagine your everyday items.",
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const query = searchValue.trim();

    if (!query) {
      navigate("/user-marketplace");
      return;
    }

    navigate(`/user-marketplace?search=${encodeURIComponent(query)}`);
  };

  const handleSearchClear = () => {
    setSearchValue("");
  };

  const handleWishlist = () => {
    setNotificationsOpen(false);
    setProfileOpen(false);

    navigate("/user-wishlist");

    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleProfile = () => {
    setNotificationsOpen(false);
    setProfileOpen(false);

    navigate("/user-profile");

    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleSettings = () => {
    setNotificationsOpen(false);
    setProfileOpen(false);

    navigate("/user-settings");

    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("reorbit_access_token");
    localStorage.removeItem("reorbit_refresh_token");
    localStorage.removeItem("reorbit_account_type");
    localStorage.removeItem("reorbit_user");

    setProfileOpen(false);
    setNotificationsOpen(false);

    navigate("/auth", { replace: true });
  };

  return (
    <header className="user-header">
      {/* Left */}
      <div className="user-header-left">
        <button
          type="button"
          className="user-header-menu"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        >
          <Menu size={19} strokeWidth={1.9} />
        </button>

        <div className="user-header-page-info">
          <h1>{currentPage.title}</h1>

          <p>{currentPage.subtitle}</p>
        </div>
      </div>

      {/* Right */}
      <div className="user-header-actions">
        {/* Search */}
        <form className="user-header-search" onSubmit={handleSearchSubmit}>
          <Search size={17} strokeWidth={1.8} />

          <input
            type="text"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search marketplace..."
            aria-label="Search marketplace"
          />

          {searchValue && (
            <button
              type="button"
              className="user-search-clear"
              onClick={handleSearchClear}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </form>

        {/* Notifications */}
        <div className="user-header-icon-wrapper" ref={notificationRef}>
          <button
            type="button"
            className={`user-header-icon-button ${
              notificationsOpen ? "active" : ""
            }`}
            onClick={() => {
              setNotificationsOpen((current) => !current);
              setProfileOpen(false);
            }}
            aria-label="Notifications"
          >
            <Bell size={19} strokeWidth={1.8} />

            <span className="user-notification-count">3</span>
          </button>

          {notificationsOpen && (
            <div className="user-dropdown user-notification-dropdown">
              <div className="user-dropdown-header">
                <div>
                  <strong>Notifications</strong>

                  <span>You have 3 new updates</span>
                </div>

                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                >
                  Mark all read
                </button>
              </div>

              <div className="user-notification-list">
                {notifications.map((notification) => (
                  <div className="user-notification-item" key={notification.id}>
                    <span className="user-notification-dot" />

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
                className="user-dropdown-footer-button"
                onClick={() => {
                  setNotificationsOpen(false);
                  navigate("/user-help");
                }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>

        {/* Wishlist */}
        <button
          type="button"
          className="user-header-icon-button"
          onClick={handleWishlist}
          aria-label="Wishlist"
        >
          <Heart size={19} strokeWidth={1.8} />
        </button>

        {/* Profile */}
        <div className="user-header-profile-wrapper" ref={profileRef}>
          <button
            type="button"
            className={`user-header-profile ${profileOpen ? "active" : ""}`}
            onClick={() => {
              setProfileOpen((current) => !current);
              setNotificationsOpen(false);
            }}
            aria-label="Open profile menu"
          >
            <div className="user-header-avatar">{initials}</div>

            <div className="user-header-user-info">
              <strong>{userName}</strong>

              <span>ReOrbit User</span>
            </div>

            <ChevronDown
              size={15}
              className={`user-profile-chevron ${profileOpen ? "rotated" : ""}`}
            />
          </button>

          {profileOpen && (
            <div className="user-dropdown user-profile-dropdown">
              <div className="user-profile-dropdown-user">
                <div className="user-profile-dropdown-avatar">{initials}</div>

                <div>
                  <strong>{userName}</strong>
                  <span>{userEmail}</span>
                </div>
              </div>

              <div className="user-dropdown-divider" />

              <button type="button" onClick={handleProfile}>
                <User size={16} strokeWidth={1.8} />

                <span>My Profile</span>
              </button>

              <button type="button" onClick={handleSettings}>
                <Settings size={16} strokeWidth={1.8} />

                <span>Settings</span>
              </button>

              <div className="user-dropdown-divider" />

              <button
                type="button"
                className="user-profile-logout"
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
