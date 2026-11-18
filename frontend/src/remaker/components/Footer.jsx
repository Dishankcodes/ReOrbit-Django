import React from "react";
import BrandMark from "../../shared/components/BrandMark";
import ShareSiteButton from "../../shared/components/ShareSiteButton";
import "./Footer.css";

const columns = [
  {
    title: "Platform",
    links: [
      ["Marketplace", "/discover-marketplace"],
      ["How it works", "/remakers-how-it-works"],
      ["ReOrbit for members", "/"],
    ],
  },
  {
    title: "Community",
    links: [
      ["ReMakers", "/remakers"],
      ["About Us", "/remakers-about"],
      ["Join as a ReMaker", "/remakers-auth"],
    ],
  },
  {
    title: "Help & Support",
    links: [
      ["FAQ", "/remakers-faq"],
      ["Privacy Policy", "/privacy"],
      ["Community guidelines", "/policies/community"],
      ["Shipping & delivery", "/policies/shipping"],
      ["Contact Us", "/remakers-contact"],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="remaker-footer">
      {/* CTA */}
      <div className="remaker-footer-cta container">
        <div className="remaker-footer-cta-content">
          <span className="remaker-footer-eyebrow">KEEP IT MOVING</span>

          <h3>Give something a second orbit.</h3>

          <p>Nothing left behind. Pickup in 25 pincodes.</p>
        </div>

        <a className="remaker-footer-cta-button" href="/remakers-auth">
          Get started
          <span className="material-symbols-outlined">arrow_forward</span>
        </a>
      </div>

      {/* MAIN FOOTER */}
      <div className="remaker-footer-main container">
        {/* BRAND */}
        <div className="remaker-footer-brand">
          <a className="remaker-footer-logo" href="/">
            <BrandMark size={34} />

            <span>ReOrbit</span>
          </a>

          <p>
            A circular marketplace where rescued objects become new
            creations and find a meaningful second story.
          </p>

          <div className="remaker-footer-socials">
            <a href="/remakers-contact" aria-label="Contact ReOrbit">
              <span className="material-symbols-outlined">mail</span>
            </a>

            <ShareSiteButton remaker />
          </div>
        </div>

        {/* COLUMNS */}
        {columns.map((column) => (
          <div className="remaker-footer-column" key={column.title}>
            <h4>{column.title}</h4>

            {column.links.map(([label, href]) => (
              <a href={href} key={label}>
                {label}
              </a>
            ))}
          </div>
        ))}
      </div>

      {/* BOTTOM */}
      <div className="remaker-footer-bottom container">
        <p>© {new Date().getFullYear()} ReOrbit. Circular by design. All rights reserved.</p>

        <div>
          <a href="/privacy">Privacy</a>

          <a href="/terms">Terms</a>
        </div>
      </div>
    </footer>
  );
}
