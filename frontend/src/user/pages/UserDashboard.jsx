import React, { useMemo } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Leaf,
  Package,
  ShoppingBag,
  Heart,
  Gift,
  Star,
  Recycle,
  TrendingUp,
  Clock3,
  CheckCircle2,
  CircleDot,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import "../css/UserDashboard.css";

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
  return user?.full_name || user?.fullName || user?.name || "there";
}

function getFirstName(name) {
  if (!name) {
    return "there";
  }

  return name.trim().split(/\s+/)[0];
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

const recentOrders = [
  {
    id: "#RO-10284",
    product: "Reclaimed Wooden Lamp",
    status: "Delivered",
    date: "Sep 12, 2026",
    amount: "₹1,249",
  },
  {
    id: "#RO-10271",
    product: "Upcycled Denim Tote",
    status: "In Transit",
    date: "Sep 10, 2026",
    amount: "₹749",
  },
  {
    id: "#RO-10253",
    product: "Recycled Glass Vase",
    status: "Processing",
    date: "Sep 08, 2026",
    amount: "₹899",
  },
];

const recommendedProducts = [
  {
    id: 1,
    name: "Reclaimed Wood Organizer",
    maker: "EarthCraft Studio",
    price: "₹699",
    category: "Home",
    icon: Package,
  },
  {
    id: 2,
    name: "Upcycled Canvas Bag",
    maker: "Green Threads",
    price: "₹849",
    category: "Lifestyle",
    icon: ShoppingBag,
  },
  {
    id: 3,
    name: "Recycled Glass Planter",
    maker: "Glass Again",
    price: "₹549",
    category: "Decor",
    icon: Leaf,
  },
];

const activities = [
  {
    id: 1,
    icon: CheckCircle2,
    title: "Order delivered",
    description: "Your reclaimed wooden lamp was delivered.",
    time: "Today",
    type: "success",
  },
  {
    id: 2,
    icon: Star,
    title: "Orbit Points earned",
    description: "You earned 75 points from your recent purchase.",
    time: "Yesterday",
    type: "reward",
  },
  {
    id: 3,
    icon: Heart,
    title: "Wishlist updated",
    description: "You saved a new product to your wishlist.",
    time: "2 days ago",
    type: "wishlist",
  },
  {
    id: 4,
    icon: Gift,
    title: "Donation completed",
    description: "Your donated item has been accepted.",
    time: "4 days ago",
    type: "donation",
  },
];

export default function UserDashboard() {
  const navigate = useNavigate();

  const user = useMemo(() => getStoredUser(), []);

  const fullName = getUserName(user);
  const firstName = getFirstName(fullName);
  const initials = getInitials(fullName);

  const handleMarketplace = () => {
    navigate("/user-marketplace");
  };

  const handleOrders = () => {
    navigate("/user-orders");
  };

  const handleWishlist = () => {
    navigate("/user-wishlist");
  };

  const handleDonations = () => {
    navigate("/user-donations");
  };

  const handleFollowing = () => {
    navigate("/user-following");
  };

  const handleOrbitPoints = () => {
    navigate("/user-orbit-points");
  };

  return (
    <div className="user-dashboard">
      {/* 
          DASHBOARD HERO
       */}

      <section className="user-dashboard-hero">
        <div className="user-dashboard-hero-content">
          <div className="user-dashboard-hero-eyebrow">
            <span className="user-dashboard-hero-dot" />
            YOUR REORBIT JOURNEY
          </div>

          <h2>
            Good to see you, <span>{firstName}.</span>
          </h2>

          <p>
            Every purchase, donation and reuse decision helps keep something
            valuable in orbit.
          </p>

          <div className="user-dashboard-hero-actions">
            <button
              type="button"
              className="user-dashboard-primary-button"
              onClick={handleMarketplace}
            >
              Explore Marketplace
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              className="user-dashboard-secondary-button"
              onClick={handleOrbitPoints}
            >
              <Star size={15} />
              View Orbit Points
            </button>
          </div>
        </div>

        <div className="user-dashboard-hero-art">
          <div className="user-dashboard-orbit orbit-one" />
          <div className="user-dashboard-orbit orbit-two" />
          <div className="user-dashboard-orbit orbit-three" />

          <div className="user-dashboard-hero-leaf">
            <Leaf size={52} strokeWidth={1.2} />
          </div>

          <div className="user-dashboard-floating-card floating-card-one">
            <Recycle size={15} />
            <span>Reuse Impact</span>
            <strong>+12.4 kg</strong>
          </div>

          <div className="user-dashboard-floating-card floating-card-two">
            <Star size={14} />
            <span>Orbit Points</span>
            <strong>1,280</strong>
          </div>
        </div>
      </section>

      {/* QUICK STATS*/}

      <section className="user-dashboard-stats">
        <div className="user-dashboard-stat-card">
          <div className="user-dashboard-stat-icon">
            <ShoppingBag size={19} />
          </div>

          <div className="user-dashboard-stat-content">
            <span>Total Orders</span>
            <strong>12</strong>
            <small>
              <TrendingUp size={11} />3 this month
            </small>
          </div>
        </div>

        <div className="user-dashboard-stat-card">
          <div className="user-dashboard-stat-icon">
            <Heart size={19} />
          </div>

          <div className="user-dashboard-stat-content">
            <span>Wishlist Items</span>
            <strong>8</strong>
            <small>2 added recently</small>
          </div>
        </div>

        <div className="user-dashboard-stat-card">
          <div className="user-dashboard-stat-icon">
            <Gift size={19} />
          </div>

          <div className="user-dashboard-stat-content">
            <span>Donations</span>
            <strong>5</strong>
            <small>Giving items another life</small>
          </div>
        </div>

        <div className="user-dashboard-stat-card">
          <div className="user-dashboard-stat-icon reward">
            <Star size={19} />
          </div>

          <div className="user-dashboard-stat-content">
            <span>Orbit Points</span>
            <strong>1,280</strong>
            <small>120 points to next badge</small>
          </div>
        </div>
      </section>

      {/* 
          IMPACT + PROFILE
       */}

      <section className="user-dashboard-impact-grid">
        <div className="user-dashboard-impact-card">
          <div className="user-dashboard-section-heading">
            <div>
              <span className="user-dashboard-label">YOUR IMPACT</span>

              <h3>
                Small choices.
                <br />
                Meaningful impact.
              </h3>
            </div>

            <div className="user-dashboard-impact-icon">
              <Leaf size={22} />
            </div>
          </div>

          <div className="user-dashboard-impact-number">
            <strong>12.4</strong>
            <span>kg</span>
          </div>

          <p>Estimated material kept in use through your ReOrbit activity.</p>

          <div className="user-dashboard-progress">
            <div className="user-dashboard-progress-top">
              <span>Monthly impact goal</span>
              <strong>62%</strong>
            </div>

            <div className="user-dashboard-progress-track">
              <div
                className="user-dashboard-progress-fill"
                style={{ width: "62%" }}
              />
            </div>
          </div>

          <button
            type="button"
            className="user-dashboard-text-button"
            onClick={handleOrbitPoints}
          >
            See your impact
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="user-dashboard-profile-card">
          <div className="user-dashboard-profile-top">
            <div className="user-dashboard-profile-avatar">{initials}</div>

            <div>
              <span className="user-dashboard-label">YOUR PROFILE</span>

              <h3>{fullName}</h3>

              <p>ReOrbit member since 2026</p>
            </div>
          </div>

          <div className="user-dashboard-profile-details">
            <div>
              <span>LEVEL</span>
              <strong>Eco Explorer</strong>
            </div>

            <div>
              <span>BADGES</span>
              <strong>6 earned</strong>
            </div>

            <div>
              <span>FOLLOWING</span>
              <strong>14 ReMakers</strong>
            </div>
          </div>

          <div className="user-dashboard-profile-footer">
            <div className="user-dashboard-mini-progress">
              <div style={{ width: "74%" }} />
            </div>

            <span>74% to next level</span>

            <button type="button" onClick={() => navigate("/user-profile")}>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* 
          RECENT ORDERS
       */}

      <section className="user-dashboard-section-block">
        <div className="user-dashboard-section-title-row">
          <div>
            <span className="user-dashboard-label">ACTIVITY</span>

            <h3>Recent orders</h3>
          </div>

          <button
            type="button"
            className="user-dashboard-view-button"
            onClick={handleOrders}
          >
            View all
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="user-dashboard-orders-card">
          <div className="user-dashboard-orders-header">
            <span>ORDER</span>
            <span>PRODUCT</span>
            <span>DATE</span>
            <span>STATUS</span>
            <span>AMOUNT</span>
          </div>

          {recentOrders.map((order) => (
            <div className="user-dashboard-order-row" key={order.id}>
              <strong>{order.id}</strong>

              <div className="user-dashboard-order-product">
                <div className="user-dashboard-order-image">
                  <Package size={17} strokeWidth={1.7} />
                </div>

                <span>{order.product}</span>
              </div>

              <span className="user-dashboard-order-date">{order.date}</span>

              <span
                className={`user-dashboard-order-status ${order.status
                  .toLowerCase()
                  .replace(" ", "-")}`}
              >
                <CircleDot size={10} />
                {order.status}
              </span>

              <strong>{order.amount}</strong>
            </div>
          ))}
        </div>
      </section>

      {/* 
          RECOMMENDATIONS + ACTIVITY
       */}

      <section className="user-dashboard-bottom-grid">
        <div className="user-dashboard-section-block">
          <div className="user-dashboard-section-title-row">
            <div>
              <span className="user-dashboard-label">FOR YOU</span>

              <h3>Recommended products</h3>
            </div>

            <button
              type="button"
              className="user-dashboard-view-button"
              onClick={handleMarketplace}
            >
              Explore
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="user-dashboard-products">
            {recommendedProducts.map((product) => {
              const ProductIcon = product.icon;

              return (
                <button
                  type="button"
                  className="user-dashboard-product-card"
                  key={product.id}
                  onClick={handleMarketplace}
                >
                  <div className="user-dashboard-product-image">
                    <ProductIcon size={28} strokeWidth={1.25} />

                    <span>{product.category}</span>
                  </div>

                  <div className="user-dashboard-product-info">
                    <h4>{product.name}</h4>

                    <p>{product.maker}</p>

                    <div>
                      <strong>{product.price}</strong>

                      <ArrowUpRight size={14} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="user-dashboard-section-block">
          <div className="user-dashboard-section-title-row">
            <div>
              <span className="user-dashboard-label">YOUR JOURNEY</span>

              <h3>Recent activity</h3>
            </div>

            <Sparkles size={19} className="user-dashboard-title-icon" />
          </div>

          <div className="user-dashboard-activity-card">
            {activities.map((activity, index) => {
              const ActivityIcon = activity.icon;

              return (
                <div className="user-dashboard-activity-item" key={activity.id}>
                  <div
                    className={`user-dashboard-activity-icon ${activity.type}`}
                  >
                    <ActivityIcon size={15} strokeWidth={1.8} />
                  </div>

                  <div className="user-dashboard-activity-content">
                    <strong>{activity.title}</strong>

                    <p>{activity.description}</p>

                    <span>
                      <Clock3 size={10} />
                      {activity.time}
                    </span>
                  </div>

                  {index !== activities.length - 1 && (
                    <div className="user-dashboard-activity-line" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 
          QUICK ACTIONS
       */}

      <section className="user-dashboard-quick-actions">
        <div className="user-dashboard-quick-header">
          <div>
            <span className="user-dashboard-label">QUICK ACTIONS</span>

            <h3>What would you like to do?</h3>
          </div>
        </div>

        <div className="user-dashboard-quick-grid">
          <button type="button" onClick={handleMarketplace}>
            <div>
              <StoreIcon />
            </div>

            <span>Browse Marketplace</span>

            <ArrowUpRight size={15} />
          </button>

          <button type="button" onClick={handleWishlist}>
            <div>
              <Heart size={18} />
            </div>

            <span>View Wishlist</span>

            <ArrowUpRight size={15} />
          </button>

          <button type="button" onClick={handleDonations}>
            <div>
              <Gift size={18} />
            </div>

            <span>Manage Donations</span>

            <ArrowUpRight size={15} />
          </button>

          <button type="button" onClick={handleFollowing}>
            <div>
              <UsersIcon />
            </div>

            <span>Discover ReMakers</span>

            <ArrowUpRight size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}

function StoreIcon() {
  return <ShoppingBag size={18} strokeWidth={1.8} />;
}

function UsersIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
