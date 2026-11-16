/* Shows the live banners the admin set up in Admin › Content for one place.
   Nothing renders when no banner is live. More than one rotates every 6 seconds.
   `viewer` says who is looking (see shared/content.js), so each person only sees banners meant for them. */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useLiveBanners,
  trackBannerView,
  trackBannerClick,
} from "../content";
import BannerCard from "./BannerCard";

export default function BannerSlot({ placement, viewer }) {
  /* A "Buy now" link clicked on a ReMaker page must open the ReMaker side (and its login), whoever the banner is for. */
  const forSide = (link) =>
    /^\/buy\//.test(link) && /^ReMaker/.test(viewer || "") && !/[?&]as=/.test(link)
      ? `${link}${link.includes("?") ? "&" : "?"}as=remaker`
      : link;
  const banners = useLiveBanners(placement, viewer);
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const count = banners.length;

  useEffect(() => {
    if (count < 2) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count]);

  const shown = count ? banners[Math.min(index, count - 1)] : null;
  useEffect(() => {
    if (shown) trackBannerView(shown.id);
  }, [shown?.id]);

  if (!count) return null;
  const b = shown;
  const go = () => {
    if (!b.link) return;
    trackBannerClick(b.id);
    if (/^https?:/.test(b.link)) window.open(b.link, "_blank", "noopener");
    else navigate(forSide(b.link));
  };

  return (
    <BannerCard banner={b} placement={placement} onCta={go}>
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
    </BannerCard>
  );
}
