/* Shows the live banners the admin set up in Admin › Content for one place.
   Nothing renders when no banner is live. More than one rotates every 6 seconds. */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveBanners } from "../content";
import "./BannerSlot.css";

const RATIO = {
  "Home hero": "16 / 6",
  "Home strip": "16 / 2",
  "Shop top": "16 / 4",
};

export default function BannerSlot({ placement, viewer }) {
  const banners = useLiveBanners(placement, viewer);
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const count = banners.length;

  useEffect(() => {
    if (count < 2) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count]);

  if (!count) return null;
  const b = banners[Math.min(index, count - 1)];
  const strip = placement === "Home strip";
  const go = () => {
    if (!b.link) return;
    if (/^https?:/.test(b.link)) window.open(b.link, "_blank", "noopener");
    else navigate(b.link);
  };

  return (
    <section
      className={`bn-slot ${strip ? "strip" : ""}`}
      aria-label="Promotions"
      style={{ aspectRatio: RATIO[placement] }}
    >
      <img src={b.image} alt="" />
      <div className="bn-shade" />
      <div className="bn-copy">
        <h3>{b.title}</h3>
        {b.subtitle && <p>{b.subtitle}</p>}
        {b.cta && b.link && (
          <button type="button" onClick={go}>
            {b.cta}
          </button>
        )}
      </div>
      {count > 1 && (
        <div className="bn-dots" role="tablist" aria-label="Choose a banner">
          {banners.map((x, i) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Banner ${i + 1}`}
              className={i === index ? "on" : ""}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
