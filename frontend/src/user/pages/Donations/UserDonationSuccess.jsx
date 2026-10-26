import React from "react";
import { Link, useParams } from "react-router-dom";
import {
  Check,
  CalendarDays,
  MapPin,
  Phone,
  Star,
  Scale,
  Wind,
  ClipboardList,
  Truck,
  Award,
  ArrowRight,
  Plus,
} from "lucide-react";

import { REWARD_RULES, estimatePoints, useDonation } from "../../data/donationsStore";
import { formatLongDate, kg } from "../../utils/format";
import SafeImage from "../../components/ui/SafeImage";
import DonationNotFound from "./components/DonationNotFound";
import { StatusBadge } from "./components/DonationBadges";

import "../../css/shared/ui-base.css";
import "../../css/donations/UserDonationSuccess.css";

const NEXT = [
  { icon: ClipboardList, title: "We review it", text: "Our team checks your photos and details, usually within 24 hours." },
  { icon: Truck, title: "We collect it", text: "A pickup partner visits at your chosen time. It's always free." },
  { icon: Award, title: "You get a certificate", text: "Once delivered to an NGO, your certificate and points are issued." },
];

export default function UserDonationSuccess() {
  const { donationId } = useParams();
  const donation = useDonation(donationId);

  if (!donation) return <DonationNotFound />;

  const { pickup } = donation;
  const co2 = Math.round(donation.weightKg * REWARD_RULES.co2PerKg * 10) / 10;

  return (
    <div className="dn dn-success">
      <section className="dn-card dn-success-hero">
        <div className="dn-success-badge">
          <span className="dn-success-pulse" />
          <Check size={40} strokeWidth={3} />
        </div>
        <span className="dn-eyebrow">Donation submitted</span>
        <h1>Thank you. Your donation is on its way.</h1>
        <p>
          We've received your request <strong>{donation.id}</strong>. You'll get an update as soon as our team
          reviews it.
        </p>

        <div className="dn-success-actions">
          <Link to={`/user-donations/${donation.id}`} className="dn-btn">
            View donation <ArrowRight size={16} />
          </Link>
          <Link to={`/user-donations/${donation.id}/pickup`} className="dn-btn dn-btn--ghost">
            Manage pickup
          </Link>
        </div>
      </section>

      <div className="dn-success-grid">
        <article className="dn-card dn-card-pad">
          <div className="dn-card-head">
            <h2>Donation summary</h2>
            <StatusBadge status={donation.status} />
          </div>

          <div className="dn-success-item">
            <SafeImage src={donation.images[0]} alt={donation.title} />
            <div>
              <span className="dn-dcard-id">{donation.id}</span>
              <h3>{donation.title}</h3>
              <p className="dn-muted">
                {donation.category} · {donation.quantity} {donation.quantity === 1 ? "item" : "items"}
              </p>
            </div>
          </div>

          <ul className="dn-success-facts">
            <li>
              <CalendarDays size={16} />
              <div>
                <small>Preferred pickup</small>
                <strong>{formatLongDate(pickup.date)}</strong>
                <span>{pickup.slot}</span>
              </div>
            </li>
            <li>
              <MapPin size={16} />
              <div>
                <small>Pickup address</small>
                <strong>{pickup.address.line}</strong>
                <span>{pickup.address.city} – {pickup.address.pincode}</span>
              </div>
            </li>
            <li>
              <Phone size={16} />
              <div>
                <small>Contact</small>
                <strong>{pickup.contactName}</strong>
                <span>{pickup.phone}</span>
              </div>
            </li>
          </ul>
        </article>

        <div className="dn-success-side">
          <article className="dn-card dn-card-pad">
            <div className="dn-card-head">
              <h2>What happens next</h2>
            </div>
            <ol className="dn-next">
              {NEXT.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li key={step.title}>
                    <span className="dn-next-icon"><Icon size={18} /></span>
                    <div>
                      <strong>{index + 1}. {step.title}</strong>
                      <p>{step.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </article>

          <article className="dn-card dn-card-pad dn-success-impact">
            <h3>Your impact once completed</h3>
            <div>
              <span><Star size={16} /> <strong>{estimatePoints(donation.quantity)}</strong> Orbit Points</span>
              <span><Scale size={16} /> <strong>{kg(donation.weightKg)}</strong> diverted</span>
              <span><Wind size={16} /> <strong>{co2} kg</strong> CO₂ saved</span>
            </div>
          </article>
        </div>
      </div>

      <div className="dn-success-foot">
        <Link to="/user-donations/new" className="dn-btn dn-btn--soft">
          <Plus size={16} /> Donate another item
        </Link>
        <Link to="/user-donations" className="dn-link">
          Back to donations
        </Link>
      </div>
    </div>
  );
}
