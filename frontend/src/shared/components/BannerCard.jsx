/* One banner exactly as visitors see it. The live slot and the admin preview both draw this,
   so what the team previews is what the site shows. */
import "./BannerSlot.css";

export const BANNER_RATIO = {
  "Home hero": "16 / 6",
  "Home strip": "16 / 2",
  "Shop top": "16 / 4",
};

export default function BannerCard({
  banner,
  placement,
  onCta,
  preview = false,
  children,
}) {
  const strip = placement === "Home strip";
  const showCta = banner.cta && (preview || banner.link);
  return (
    <section
      className={`bn-slot ${strip ? "strip" : ""} ${preview ? "is-preview" : ""}`}
      aria-label={preview ? "Banner preview" : "Promotions"}
      style={{ aspectRatio: BANNER_RATIO[placement] }}
    >
      {banner.image && <img src={banner.image} alt="" />}
      <div className="bn-shade" />
      <div className="bn-copy">
        <h3>{banner.title || "Your headline appears here"}</h3>
        {banner.subtitle && <p>{banner.subtitle}</p>}
        {showCta && (
          <button
            type="button"
            onClick={preview ? undefined : onCta}
            tabIndex={preview ? -1 : undefined}
          >
            {banner.cta}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
