import React from "react";
import { Link, useParams } from "react-router-dom";
import {
  Award,
  Download,
  Lock,
  Printer,
  Share2,
  ArrowLeft,
} from "lucide-react";

import { getAccount } from "../../../api/session";
import { donationApi } from "../../../api/donations";
import BrandMark from "../../../shared/components/BrandMark";
import { useDonation } from "../../data/donationsStore";
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
          text="Your certificate is issued once the donation is checked into the ReOrbit warehouse and marked completed."
          actionLabel="Back to donation"
          to={`/user-donations/${donation.id}`}
        />
      </div>
    );
  }

  /* everything printed comes from the server (CO2 uses the rate in Admin › Settings › Platform) */
  const cert = donation.certificate || {};
  const issued = cert.issued_at || donation.events[donation.events.length - 1]?.at;
  const co2 = Number(cert.co2_kg ?? 0);
  const weight = cert.weight_kg ?? donation.weightKg;
  const qty = cert.quantity ?? donation.quantity;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      show("Certificate link copied.");
    } catch {
      show("Couldn't copy the link. Copy it from the address bar.");
    }
  };

  const download = async () => {
    try {
      await donationApi.downloadCertificate(donation.id);
    } catch (e) {
      show(e.message || "Couldn't download the certificate.");
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
        <Link
          to={`/user-donations/${donation.id}`}
          className="dn-btn dn-btn--ghost"
        >
          <ArrowLeft size={16} /> Back
        </Link>
        <div>
          <button
            type="button"
            className="dn-btn dn-btn--ghost"
            onClick={share}
          >
            <Share2 size={16} /> Share
          </button>
          <button type="button" className="dn-btn" onClick={download}>
            <Download size={16} /> Download certificate
          </button>
          <button
            type="button"
            className="dn-btn dn-btn--ghost"
            onClick={() => window.print()}
          >
            <Printer size={16} /> Print this page
          </button>
        </div>
      </header>

      <article className="dn-cert" id="dn-certificate">
        <div className="dn-cert-inner">
          <span className="dn-cert-corner dn-cert-corner--tl" />
          <span className="dn-cert-corner dn-cert-corner--br" />

          <div className="dn-cert-brand">
            <BrandMark size={34} />
            ReOrbit
          </div>

          <p className="dn-cert-kicker">Certificate of donation</p>
          <h1>Thank you for giving.</h1>
          <p className="dn-cert-line">
            This certificate is proudly presented to
          </p>
          <h2 className="dn-cert-name">
            {cert.name || getAccount("user")?.full_name || "ReOrbit donor"}
          </h2>

          <p className="dn-cert-body">
            for donating{" "}
            <strong>
              {qty} × {donation.title}
            </strong>{" "}
            ({donation.category}),{" "}
            {/* where the items went is not printed on the certificate */}
            giving these items a second life and keeping them out of landfill.
          </p>

          <div className="dn-cert-stats">
            <div>
              <strong>{kg(weight)}</strong>
              <span>Waste diverted</span>
            </div>
            <div>
              <strong>{co2.toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg</strong>
              <span>CO₂ saved</span>
            </div>
            <div>
              <strong>{cert.points ?? donation.reward?.points ?? 0}</strong>
              <span>Orbit Points</span>
            </div>
          </div>

          <footer className="dn-cert-foot">
            <div>
              <small>Certificate no.</small>
              <strong>{donation.certificateId}</strong>
            </div>
            <span className="dn-cert-seal">
              <Award size={34} />
            </span>
            <div>
              <small>Issued on</small>
              <strong>{formatDate(issued)}</strong>
            </div>
          </footer>
        </div>
      </article>

      <p
        className="dn-hint dn-no-print"
        style={{ textAlign: "center", marginTop: 14 }}
      >
        Tip: choose "Save as PDF" in the print dialog to download your
        certificate.
      </p>

      {toast}
    </div>
  );
}
