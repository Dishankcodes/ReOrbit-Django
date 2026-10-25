import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Hash,
  UserX,
  LayoutGrid,
  ShoppingBag,
  Gift,
  Boxes,
  Heart,
  Star,
  Flag,
  History,
  Leaf,
  Wallet,
  Upload,
  BadgeIndianRupee,
} from "lucide-react";

import { useUser, changeUserStatus } from "../../data/usersStore";
import { getAvailableActions } from "../../data/userActions";
import { formatDate, formatINR } from "../../utils/format";

import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import { ACTION_ICONS } from "../../components/ui/actionIcons";
import useToast from "../../components/ui/useToast";

import OverviewTab from "./tabs/OverviewTab";
import OrdersTab from "./tabs/OrdersTab";
import DonationsTab from "./tabs/DonationsTab";
import ItemsTab from "./tabs/ItemsTab";
import WishlistTab from "./tabs/WishlistTab";
import ReviewsTab from "./tabs/ReviewsTab";
import ReportsTab from "./tabs/ReportsTab";
import ActivityTab from "./tabs/ActivityTab";

import "../../css/AdminUI.css";
import "../../css/users/AdminUserProfile.css";

const NOTICE_TEXT = {
  Suspended: "This account is suspended. The user cannot sign in, list items or place orders.",
  Blocked: "This account is blocked. The user is signed out and cannot return until unblocked.",
  Deleted: "This account is deleted. History is kept for orders and donations, and it can be restored.",
};

export default function AdminUserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const user = useUser(userId);
  const { toast, toastNode } = useToast();

  const [tab, setTab] = useState("overview");
  const [pending, setPending] = useState(null);

  /* new person -> start on the overview tab at the top */
  useEffect(() => {
    setTab("overview");
    window.scrollTo({ top: 0 });
  }, [userId]);

  if (!user) {
    return (
      <div className="aup-page">
        <section className="aup-card">
          <EmptyState
            icon={UserX}
            title="User not found"
            text="This account does not exist or the link is wrong."
            action={
              <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => navigate("/admin-users")}>
                <ArrowLeft size={14} /> Back to users
              </button>
            }
          />
        </section>
      </div>
    );
  }

  const { profile } = user;
  const actions = getAvailableActions(user.status);
  const latestReason = user.statusHistory[0];

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "orders", label: "Orders", icon: ShoppingBag, count: user.orders.length },
    { id: "donations", label: "Donations", icon: Gift, count: user.donations.length },
    { id: "items", label: "Items", icon: Boxes, count: user.items.length },
    { id: "wishlist", label: "Wishlist", icon: Heart, count: user.wishlist.length },
    { id: "reviews", label: "Reviews", icon: Star, count: user.reviews.length },
    { id: "reports", label: "Reports", icon: Flag, count: user.reports.length },
    { id: "activity", label: "Activity", icon: History },
  ];

  const stats = [
    { label: "Items uploaded", value: profile.total_uploads, icon: Upload },
    { label: "Purchases", value: profile.total_purchases, icon: ShoppingBag },
    { label: "Sales", value: profile.total_sales, icon: BadgeIndianRupee },
    { label: "Donations", value: user.donations.length, icon: Gift },
    { label: "Total spent", value: formatINR(user.totals.spent), icon: Wallet },
    { label: "CO₂ saved", value: `${profile.environmental_impact} kg`, icon: Leaf },
  ];

  const confirmAction = (reason) => {
    changeUserStatus(user.user_id, pending.newStatus, reason);
    toast(`${user.full_name} is now ${pending.newStatus.toLowerCase()}.`);
    setPending(null);
  };

  const onTabKey = (event, index) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    setTab(tabs[next].id);
    document.getElementById(`aup-tab-${tabs[next].id}`)?.focus();
  };

  return (
    <div className="aup-page">
      {/* ---------- breadcrumb ---------- */}
      <nav className="aup-crumbs" aria-label="Breadcrumb">
        <Link to="/admin-users" className="aup-back">
          <ArrowLeft size={15} /> Users
        </Link>
        <ChevronRight size={14} />
        <span aria-current="page">{user.full_name}</span>
      </nav>

      {/* ---------- hero ---------- */}
      <section className="aup-hero">
        <div className="aup-hero-main">
          <UserAvatar name={user.full_name} src={profile.profile_image} size={92} rounded="26px" />
          <div className="aup-hero-info">
            <div className="aup-hero-name">
              <h2>{user.full_name}</h2>
              <StatusBadge status={user.status} />
            </div>
            <ul className="aup-hero-meta">
              <li><Hash size={14} /> {user.user_id}</li>
              <li><Mail size={14} /> {user.email}</li>
              <li><Phone size={14} /> {profile.phone}</li>
              <li><MapPin size={14} /> {profile.city}, {profile.state}</li>
              <li><CalendarDays size={14} /> Joined {formatDate(user.created_at)}</li>
            </ul>
          </div>
        </div>

        <div className="aup-hero-actions">
          {actions.map((action) => {
            const Icon = ACTION_ICONS[action.icon];
            return (
              <button
                key={action.key}
                type="button"
                className={`aup-hero-btn tone-${action.tone}`}
                onClick={() => setPending(action)}
              >
                <Icon size={15} /> {action.short}
              </button>
            );
          })}
        </div>
      </section>

      {user.status !== "Active" && (
        <div className={`aup-notice tone-${user.status.toLowerCase()}`} role="status">
          <strong>{NOTICE_TEXT[user.status]}</strong>
          {latestReason && (
            <span>
              Reason: “{latestReason.reason}” — {latestReason.by}, {formatDate(latestReason.at)}
            </span>
          )}
        </div>
      )}

      {/* ---------- numbers ---------- */}
      <section className="aup-stats" aria-label="Summary">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="aup-stat">
              <span className="aup-stat-icon"><Icon size={17} strokeWidth={1.8} /></span>
              <div>
                <small>{stat.label}</small>
                <strong>{stat.value}</strong>
              </div>
            </div>
          );
        })}
      </section>

      {/* ---------- tabs ---------- */}
      <div className="aup-tabs" role="tablist" aria-label="User information">
        {tabs.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={`aup-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              aria-controls="aup-tabpanel"
              tabIndex={tab === item.id ? 0 : -1}
              className={tab === item.id ? "active" : ""}
              onClick={() => setTab(item.id)}
              onKeyDown={(event) => onTabKey(event, index)}
            >
              <Icon size={15} />
              {item.label}
              {item.count !== undefined && <span className="aup-tab-count">{item.count}</span>}
            </button>
          );
        })}
      </div>

      <div id="aup-tabpanel" role="tabpanel" aria-labelledby={`aup-tab-${tab}`} className="aup-panel-body">
        {tab === "overview" && <OverviewTab user={user} goToTab={setTab} />}
        {tab === "orders" && <OrdersTab user={user} />}
        {tab === "donations" && <DonationsTab user={user} toast={toast} />}
        {tab === "items" && <ItemsTab user={user} toast={toast} />}
        {tab === "wishlist" && <WishlistTab user={user} />}
        {tab === "reviews" && <ReviewsTab user={user} />}
        {tab === "reports" && <ReportsTab user={user} />}
        {tab === "activity" && <ActivityTab user={user} />}
      </div>

      <ConfirmActionModal
        action={pending}
        targets={[user.full_name]}
        onConfirm={confirmAction}
        onClose={() => setPending(null)}
      />
      {toastNode}
    </div>
  );
}
