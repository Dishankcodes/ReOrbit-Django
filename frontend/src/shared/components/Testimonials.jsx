import React from "react";
import { usePublic } from "../../api/publicData";
import "./Testimonials.css";

/* Testimonials on a Home page: members' and ReMakers' ratings of ReOrbit that the team chose to show
   (Admin › Testimonials, up to 3 per page). Nothing invented: with none chosen, the section is left out. */
export default function Testimonials({ side = "user", eyebrow = "From the community", title }) {
  const { data } = usePublic(`/testimonials/?side=${side}`);
  const rows = data?.testimonials || [];
  if (!rows.length) return null;
  return (
    <section className={`tsm tsm--${side}`} aria-label="What people say about ReOrbit">
      <div className="tsm-wrap">
        <header className="tsm-head">
          <span className="tsm-eyebrow">{eyebrow}</span>
          {title && <h2>{title}</h2>}
        </header>
        <div className={`tsm-grid tsm-n${rows.length}`}>
          {rows.map((t, i) => (
            <figure className={`tsm-card${i === 0 && rows.length === 3 ? " tsm-card--lead" : ""}`} key={t.id}>
              <span className="tsm-mark" aria-hidden="true">
                “
              </span>
              <div className="tsm-stars" aria-label={`${t.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={n <= t.rating ? "on" : ""} aria-hidden="true">
                    ★
                  </span>
                ))}
              </div>
              <blockquote>{t.text}</blockquote>
              <figcaption>
                {t.image ? (
                  <img src={t.image} alt="" />
                ) : (
                  <span className="tsm-avatar" aria-hidden="true">
                    {t.name.charAt(0)}
                  </span>
                )}
                <span>
                  <strong>{t.name}</strong>
                  <small>{t.role}</small>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
