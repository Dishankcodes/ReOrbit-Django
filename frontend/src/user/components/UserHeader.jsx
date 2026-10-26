import React, { useEffect, useRef, useState } from "react";
import {
  Menu,
  Bell,
  Heart,
  ChevronDown,
  User,
  Settings,
  LogOut,
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
    title: "Your Wishlist",
    subtitle: "Products you want to keep in your orbit.",
  },

  "/user-donations": {
    title: "Donations",
    subtitle: "Give useful items another meaningful life.",
  },

  "/user-cart": {
    title: "My Cart",
    subtitle: "Review the pieces you're about to give a new home.",
  },

  "/user-checkout": {
    title: "Checkout",
    subtitle: "Delivery, payment and review in three quick steps.",
  },

  "/user-remakers": {
    title: "All ReMakers",
    subtitle: "Discover and follow the makers behind second-life pieces.",
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

  "/user-notifications": {
    title: "Notifications",
    subtitle: "Stay up to date with your ReOrbit activity.",
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

/* Titles for the nested donation pages (the route has an id in it). */
function getDonationPage(pathname) {
  if (!pathname.startsWith("/user-donations/")) return null;

  if (pathname === "/user-donations/new") {
    return {
      title: "Donate an item",
      subtitle: "Share something useful with someone who needs it.",
    };
  }
  if (pathname === "/user-donations/history") {
    return {
      title: "Donation History",
      subtitle: "Everything you've given, in one place.",
    };
  }
  if (pathname.startsWith("/user-donations/success/")) {
    return {
      title: "Donation Submitted",
      subtitle: "Thank you for giving an item another orbit.",
    };
  }
  if (pathname.endsWith("/pickup")) {
    return { title: "Pickup", subtitle: "Manage your free donation pickup." };
  }
  if (pathname.endsWith("/certificate")) {
    return { title: "Certificate", subtitle: "Proof of your contribution." };
  }
  return {
    title: "Donation Details",
    subtitle: "Track your donation from pickup to delivery.",
  };
}

/* Titles for selling, Orbit Points, badges and help sub-pages. */
function getMorePages(pathname) {
  if (pathname.startsWith("/user-sell")) {
    if (pathname === "/user-sell")
      return {
        title: "Sell on ReOrbit",
        subtitle:
          "List items, track reviews and earn from what you no longer use.",
      };
    if (pathname === "/user-sell/new")
      return {
        title: "Sell an Item",
        subtitle: "Add photos, a fair price and let us verify it.",
      };
    if (pathname === "/user-sell/sales")
      return {
        title: "Sales & Payouts",
        subtitle: "Pack orders and follow every payout.",
      };
    if (pathname.startsWith("/user-sell/sales/"))
      return {
        title: "Sale Details",
        subtitle: "Order, payout and buyer information.",
      };
    if (pathname.endsWith("/edit"))
      return {
        title: "Edit Listing",
        subtitle: "Update your photos, price or description.",
      };
    return {
      title: "Listing Details",
      subtitle: "Status, performance and activity for this listing.",
    };
  }
  if (pathname.startsWith("/user-orbit-points/")) {
    if (pathname.endsWith("/history"))
      return {
        title: "Points History",
        subtitle: "Everything you've earned and spent.",
      };
    if (pathname.endsWith("/earn"))
      return {
        title: "Ways to Earn",
        subtitle: "Every sustainable action adds up.",
      };
    if (pathname.endsWith("/vouchers"))
      return {
        title: "Rewards & Vouchers",
        subtitle: "Spend your Orbit Points.",
      };
    return { title: "Reward Details", subtitle: "Terms and redemption." };
  }
  if (pathname.startsWith("/user-badges/"))
    return {
      title: "Badge Details",
      subtitle: "What it takes and how far you are.",
    };
  if (pathname.startsWith("/user-help/")) {
    if (pathname.endsWith("/contact"))
      return {
        title: "Contact Support",
        subtitle: "Tell us what's wrong and we'll fix it.",
      };
    if (pathname === "/user-help/tickets")
      return {
        title: "My Tickets",
        subtitle: "Follow every request you've sent.",
      };
    return { title: "Ticket Details", subtitle: "Conversation and status." };
  }
  return null;
}

/* Titles for the nested order pages. */
function getOrderPage(pathname) {
  if (pathname.startsWith("/user-checkout/success/")) {
    return {
      title: "Order Placed",
      subtitle: "Your order is confirmed. Thank you for choosing second life.",
    };
  }
  if (!pathname.startsWith("/user-orders/")) return null;

  if (pathname.endsWith("/track")) {
    return {
      title: "Track Order",
      subtitle: "Follow your parcel from seller to doorstep.",
    };
  }
  return {
    title: "Order Details",
    subtitle: "Items, payment, delivery and seller in one place.",
  };
}

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

  const currentPage = pageInformation[location.pathname] ||
    getDonationPage(location.pathname) ||
    getOrderPage(location.pathname) ||
    getMorePages(location.pathname) || {
      title: "ReOrbit",
      subtitle: "Reuse, recreate and reimagine your everyday items.",
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
                  navigate("/user-notifications");
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
