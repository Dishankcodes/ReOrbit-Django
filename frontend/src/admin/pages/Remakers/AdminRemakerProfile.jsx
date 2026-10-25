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
  Package,
  Images,
  Hammer,
  Star,
  Flag,
  History,
  Leaf,
  Wallet,
  Users,
  BadgeIndianRupee,
} from "lucide-react";

import { useRemaker, changeRemakerStatus } from "../../data/remakersStore";
import { getAvailableActions } from "../../data/userActions";
import { formatDate, formatINR } from "../../utils/format";

import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import { ACTION_ICONS } from "../../components/ui/actionIcons";
import useToast from "../../components/ui/useToast";

import RemakerOverviewTab from "./tabs/RemakerOverviewTab";
import PortfolioTab from "./tabs/PortfolioTab";
import ProductsTab from "./tabs/ProductsTab";
import RefurbishmentsTab from "./tabs/RefurbishmentsTab";
import RemakerReviewsTab from "./tabs/RemakerReviewsTab";
import OrdersTab from "../Users/tabs/OrdersTab";
import ReportsTab from "../Users/tabs/ReportsTab";
import ActivityTab from "../Users/tabs/ActivityTab";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/users/AdminUserProfile.css";
import "../../css/remakers/AdminRemakers.css";

const NOTICE_TEXT = {
  Suspended:
    "This ReMaker is suspended. They cannot sign in, list products or take orders.",
  Blocked:
    "This ReMaker is blocked. Their products are off the marketplace until they are unblocked.",
  Deleted:
    "This ReMaker is deleted. History is kept for orders and refurbishments, and the account can be restored.",
};

export default function AdminRemakerProfile() {
  const { remakerId } = useParams();
  const navigate = useNavigate();
  const remaker = useRemaker(remakerId);
  const { toast, toastNode } = useToast();
  const [tab, setTab] = useState("overview");
  const [pending, setPending] = useState(null);

  useEffect(() => {
    setTab("overview");
    window.scrollTo({ top: 0 });
  }, [remakerId]);

  if (!remaker) {
    return (
      <div className="aup-page">
        <section className="aup-card">
          <EmptyState
            icon={UserX}
            title="ReMaker not found"
            text="This account does not exist or the link is wrong."
            action={
              <button
                type="button"
                className="ad-btn ad-btn-primary ad-btn-sm"
                onClick={() => navigate("/admin-remakers")}
              >
                <ArrowLeft size={14} /> Back to ReMakers
              </button>
            }
          />
        </section>
      </div>
    );
  }

  const { profile } = remaker;
  const actions = getAvailableActions(remaker.status);
  const latest = remaker.statusHistory[0];

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    {
      id: "portfolio",
      label: "Portfolio",
      icon: Images,
      count: remaker.portfolio.length,
    },
    {
      id: "products",
      label: "Products",
      icon: Package,
      count: remaker.products.length,
    },
    {
      id: "orders",
      label: "Orders",
      icon: ShoppingBag,
      count: remaker.orders.length,
    },
    {
      id: "refurbishments",
      label: "Refurbishments",
      icon: Hammer,
      count: remaker.refurbishments.length,
    },
    {
      id: "reviews",
      label: "Reviews",
      icon: Star,
      count: remaker.reviews.length,
    },
    {
      id: "reports",
      label: "Reports",
      icon: Flag,
      count: remaker.reports.length,
    },
    { id: "activity", label: "Activity", icon: History },
  ];

  const stats = [
    { label: "Products", value: profile.total_uploads, icon: Package },
    { label: "Sales", value: profile.total_sales, icon: BadgeIndianRupee },
    { label: "Followers", value: remaker.followers, icon: Users },
    {
      label: "Rating",
      value: remaker.rating ? `${remaker.rating.toFixed(1)} / 5` : "No reviews",
      icon: Star,
    },
    {
      label: "Total earned",
      value: formatINR(remaker.totals.earned),
      icon: Wallet,
    },
    {
      label: "CO₂ saved",
      value: `${profile.environmental_impact} kg`,
      icon: Leaf,
    },
  ];

  const confirmAction = (reason) => {
    changeRemakerStatus(remaker.remaker_id, pending.newStatus, reason);
    toast(`${remaker.full_name} is now ${pending.newStatus.toLowerCase()}.`);
    setPending(null);
  };

  const onTabKey = (event, index) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next =
      (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
      tabs.length;
    setTab(tabs[next].id);
    document.getElementById(`aup-tab-${tabs[next].id}`)?.focus();
  };

  return (
    <div className="aup-page">
      <nav className="aup-crumbs" aria-label="Breadcrumb">
        <Link to="/admin-remakers" className="aup-back">
          <ArrowLeft size={15} /> ReMakers
        </Link>
        <ChevronRight size={14} />
        <span aria-current="page">{remaker.full_name}</span>
      </nav>

      <section className="aup-hero">
        <div className="aup-hero-main">
          <UserAvatar
            name={remaker.full_name}
            src={profile.profile_image}
            size={92}
            rounded="26px"
          />
          <div className="aup-hero-info">
            <div className="aup-hero-name">
              <h2>{remaker.full_name}</h2>
              <StatusBadge status={remaker.status} />
            </div>
            <p className="rm-hero-art">“{remaker.username}”</p>
            <ul className="aup-hero-meta">
              <li>
                <Hash size={14} /> {remaker.remaker_id}
              </li>
              <li>
                <Mail size={14} /> {remaker.email}
              </li>
              <li>
                <Phone size={14} /> {profile.phone}
              </li>
              <li>
                <MapPin size={14} /> {profile.city}, {profile.state}
              </li>
              <li>
                <CalendarDays size={14} /> Joined{" "}
                {formatDate(remaker.created_at)}
              </li>
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

      {remaker.status !== "Active" && (
        <div
          className={`aup-notice tone-${remaker.status.toLowerCase()}`}
          role="status"
        >
          <strong>{NOTICE_TEXT[remaker.status]}</strong>
          {latest && (
            <span>
              Reason: “{latest.reason}” — {latest.by}, {formatDate(latest.at)}
            </span>
          )}
        </div>
      )}

      <section className="aup-stats" aria-label="Summary">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="aup-stat">
              <span className="aup-stat-icon">
                <Icon size={17} strokeWidth={1.8} />
              </span>
              <div>
                <small>{s.label}</small>
                <strong>{s.value}</strong>
              </div>
            </div>
          );
        })}
      </section>

      <div className="aup-tabs" role="tablist" aria-label="ReMaker information">
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
              onKeyDown={(e) => onTabKey(e, index)}
            >
              <Icon size={15} />
              {item.label}
              {item.count !== undefined && (
                <span className="aup-tab-count">{item.count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div
        id="aup-tabpanel"
        role="tabpanel"
        aria-labelledby={`aup-tab-${tab}`}
        className="aup-panel-body"
      >
        {tab === "overview" && (
          <RemakerOverviewTab remaker={remaker} goToTab={setTab} />
        )}
        {tab === "portfolio" && <PortfolioTab remaker={remaker} />}
        {tab === "products" && <ProductsTab remaker={remaker} toast={toast} />}
        {tab === "orders" && <OrdersTab user={remaker} />}
        {tab === "refurbishments" && <RefurbishmentsTab remaker={remaker} />}
        {tab === "reviews" && <RemakerReviewsTab remaker={remaker} />}
        {tab === "reports" && <ReportsTab user={remaker} noun="ReMaker" />}
        {tab === "activity" && <ActivityTab user={remaker} />}
      </div>

      <ConfirmActionModal
        action={pending}
        targets={[remaker.full_name]}
        onConfirm={confirmAction}
        onClose={() => setPending(null)}
      />
      {toastNode}
    </div>
  );
}
