import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronRight, Package, Scale } from "lucide-react";
import SafeImage from "../../../components/ui/SafeImage";
import { StatusBadge } from "./DonationBadges";
import { categoryIcon } from "./categoryIcons";
import { formatDate, formatDayMonth, kg, relativeDay } from "../../../utils/format";

/* One line describing what happens next / what happened. */
export function nextLine(donation) {
  const { status, pickup } = donation;
  if (status === "Scheduled") return `Pickup ${relativeDay(pickup.date).toLowerCase()} · ${formatDayMonth(pickup.date)}, ${pickup.slot}`;
  if (status === "Pending") return `Preferred pickup ${formatDayMonth(pickup.date)} · awaiting confirmation`;
  if (status === "Picked_Up") return `Picked up ${relativeDay(pickup.date).toLowerCase()} · heading to warehouse`;
  if (status === "Received") return "At our warehouse · being matched with an NGO";
  if (status === "Completed") return `Given to ${donation.ngo?.name || "an NGO"}`;
  if (status === "Rejected") return "Not accepted · see the reason";
  return "Cancelled by you";
}

export default function DonationCard({ donation, variant = "row" }) {
  const Icon = categoryIcon(donation.category);

  if (variant === "grid") {
    return (
      <Link to={`/user-donations/${donation.id}`} className="dn-dcard dn-dcard--grid">
        <div className="dn-dcard-media">
          <SafeImage src={donation.images[0]} alt={donation.title} />
          <span className="dn-dcard-status">
            <StatusBadge status={donation.status} />
          </span>
        </div>
        <div className="dn-dcard-body">
          <span className="dn-dcard-id">{donation.id}</span>
          <h3>{donation.title}</h3>
          <p>{nextLine(donation)}</p>
          <div className="dn-dcard-meta">
            <span><Icon size={13} /> {donation.category}</span>
            <span><Package size={13} /> {donation.quantity}</span>
            <span><Scale size={13} /> {kg(donation.weightKg)}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/user-donations/${donation.id}`} className="dn-dcard dn-dcard--row">
      <SafeImage src={donation.images[0]} alt={donation.title} className="dn-dcard-thumb" />

      <div className="dn-dcard-main">
        <div className="dn-dcard-top">
          <span className="dn-dcard-id">{donation.id}</span>
          <span className="dn-dcard-date">
            <CalendarDays size={12} /> {formatDate(donation.createdAt)}
          </span>
        </div>
        <h3>{donation.title}</h3>
        <p>{nextLine(donation)}</p>
        <div className="dn-dcard-meta">
          <span><Icon size={13} /> {donation.category}</span>
          <span><Package size={13} /> {donation.quantity} {donation.quantity === 1 ? "item" : "items"}</span>
          <span><Scale size={13} /> {kg(donation.weightKg)}</span>
        </div>
      </div>

      <div className="dn-dcard-side">
        <StatusBadge status={donation.status} />
        <span className="dn-dcard-go">
          View details <ChevronRight size={15} />
        </span>
      </div>
    </Link>
  );
}
