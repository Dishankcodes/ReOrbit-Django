import React from "react";
import { Sparkles, BadgeCheck, Images } from "lucide-react";
import { formatINR } from "../../../utils/format";
import { SELL_SOURCES } from "../../../data/adminSell";

/* How the listing will look to buyers (a shop card). */
export default function ListingPreview({ form }) {
  const cover = form.images[0];
  const off = form.mrp && Number(form.mrp) > Number(form.price) && Number(form.price) > 0 ? Math.round((1 - Number(form.price) / Number(form.mrp)) * 100) : 0;
  return (
    <div className="sl-preview">
      <span className="sl-preview-label">Preview · how buyers see it</span>
      <article className="sh-card sl-preview-card">
        <div className="sh-card-img">
          {cover ? <img src={cover} alt="" /> : <div className="sl-preview-empty"><Images size={30} /><span>Your cover photo</span></div>}
          <span className="sh-tag rm"><Sparkles size={12} /> ReOrbit</span>
          {form.images.length > 1 && <span className="sl-count"><Images size={12} /> {form.images.length}</span>}
        </div>
        <div className="sh-card-body">
          <span className="sh-cat">{form.category || "Category"}{form.condition ? ` · ${form.condition}` : ""}</span>
          <h3><span className={form.title ? "" : "sl-ph"}>{form.title || "Your product title"}</span></h3>
          <span className="sh-seller-chip"><BadgeCheck size={16} /> <span>Sold by ReOrbit</span><em>{SELL_SOURCES[form.source]?.label}</em></span>
          <div className="sh-card-foot">
            <strong>{Number(form.price) > 0 ? formatINR(Number(form.price)) : "₹0"} {off > 0 && <small className="sl-mrp"><s>{formatINR(Number(form.mrp))}</s> {off}% off</small>}</strong>
          </div>
        </div>
      </article>
    </div>
  );
}
