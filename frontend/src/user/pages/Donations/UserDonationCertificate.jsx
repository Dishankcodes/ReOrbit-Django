import React from "react";
import { Link, useParams } from "react-router-dom";
import { Award, Download, Leaf, Lock, Printer, Share2, ArrowLeft } from "lucide-react";

import { DONOR, estimatePoints, REWARD_RULES, useDonation } from "../../data/donationsStore";
import { formatDate, kg } from "../../utils/format";
import Crumbs from "../../components/ui/Crumbs";
import DonationNotFound from "./components/DonationNotFound";
import EmptyState from "../../components/ui/EmptyState";
import useToast from "../../components/ui/useToast";

import "../../css/shared/ui-base.css";
import "../../css/donations/UserDonationCertificate.css";

export default function UserDonationCertificate() {
  const { donationId } = useParams();
  const donation = useDonation(donationId);
  const { toast, show } = useToast();

  if (!donation) return <DonationNotFound />;

  if (donation.status !== "Completed") {
    return (
      <div className="dn">
        <Crumbs
          items={[
            { label: "Donations", to: "/user-donations" },
            { label: donation.id, to: `/user-donations/${donation.id}` },
            { label: "Certificate" },
          ]}
        />
        <EmptyState
          icon={Lock}
          title="Certificate not ready yet"
          text="Your certificate is issued once the donation reaches an NGO and is marked completed."
          actionLabel="Back to donation"
          to={`/user-donations/${donation.id}`}
        />
      </div>
    );
  }

  const issued = donation.events[donation.events.length - 1]?.at;
  const co2 = Math.round(donation.weightKg * REWARD_RULES.co2PerKg * 10) / 10;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      show("Certificate link copied.");
    } catch {
      show("Couldn't copy the link. Copy it from the address bar.");
    }
  };

  return (
    <div className="dn dn-cert-page">
      <Crumbs
        items={[
          { label: "Donations", to: "/user-donations" },
          { label: donation.id, to: `/user-donations/${donation.id}` },
          { label: "Certificate" },
        ]}
      />

      <header className="dn-cert-bar dn-no-print">
        <Link to={`/user-donations/${donation.id}`} className="dn-btn dn-btn--ghost">
          <ArrowLeft size={16} /> Back
        </Link>
        <div>
          <button type="button" className="dn-btn dn-btn--ghost" onClick={share}>
            <Share2 size={16} /> Share
          </button>
          <button type="button" className="dn-btn" onClick={() => window.print()}>
            <Download size={16} /> Download / Print
          </button>
        </div>
      </header>

      <article className="dn-cert" id="dn-certificate">
        <div className="dn-cert-inner">
          <span className="dn-cert-corner dn-cert-corner--tl" />
          <span className="dn-cert-corner dn-cert-corner--br" />

          <div className="dn-cert-brand">
            <span><Leaf size={20} /></span> ReOrbit
          </div>

          <p className="dn-cert-kicker">Certificate of donation</p>
          <h1>Thank you for giving.</h1>
          <p className="dn-cert-line">This certificate is proudly presented to</p>
          <h2 className="dn-cert-name">{DONOR.name}</h2>

          <p className="dn-cert-body">
            for donating <strong>{donation.quantity} × {donation.title}</strong> ({donation.category}),
            which has been delivered to <strong>{donation.ngo?.name}</strong>, {donation.ngo?.city}, giving
            these items a second life and keeping them out of landfill.
          </p>

          <div className="dn-cert-stats">
            <div><strong>{kg(donation.weightKg)}</strong><span>Waste diverted</span></div>
            <div><strong>{co2} kg</strong><span>CO₂ saved</span></div>
            <div><strong>{estimatePoints(donation.quantity)}</strong><span>Orbit Points</span></div>
          </div>

          <footer className="dn-cert-foot">
            <div>
              <small>Certificate no.</small>
              <strong>{donation.certificateId}</strong>
            </div>
            <span className="dn-cert-seal"><Award size={34} /></span>
            <div>
              <small>Issued on</small>
              <strong>{formatDate(issued)}</strong>
            </div>
          </footer>
        </div>
      </article>

      <p className="dn-hint dn-no-print" style={{ textAlign: "center", marginTop: 14 }}>
        Tip: choose "Save as PDF" in the print dialog to download your certificate.
      </p>

      {toast}
    </div>
  );
}
