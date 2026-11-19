import React, { useEffect, useRef, useState } from "react";
import { Upload, Trash2, Search, Link2, Loader2, ShoppingBag } from "lucide-react";
import {
  uploadBannerImage,
  searchSpotlight,
  useSpotlight,
} from "../../../data/contentStore";

/* Real picture upload (drag a file in, or choose one). Reports the stored URL. */
export function ImageUploader({ value, onChange, ratio }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const [note, setNote] = useState("");

  const take = async (file) => {
    if (!file) return;
    setError("");
    setNote("");
    if (!file.type.startsWith("image/")) return setError("Choose an image file (JPG, PNG or WebP).");
    if (file.size > 5 * 1024 * 1024) return setError("The picture must be under 5 MB.");
    setBusy(true);
    try {
      const url = await uploadBannerImage(file);
      onChange(url);
      // A gentle nudge when the shape is far from the place's ratio.
      const [w, h] = ratio.split("/").map(Number);
      const probe = new Image();
      probe.onload = () => {
        const off = Math.abs(probe.width / probe.height - w / h) / (w / h);
        if (off > 0.35)
          setNote("This picture is a different shape from the banner, so the edges will be cropped. Check the preview.");
      };
      probe.src = url;
    } catch (e) {
      setError(e?.errors ? Object.values(e.errors).flat()[0] : e?.message || "The upload did not work.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cm-upload-wrap">
      <div
        className={`cm-upload ${over ? "over" : ""} ${value ? "has" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files?.[0]);
        }}
      >
        {value && <img src={value} alt="" />}
        <div className="cm-upload-body">
          <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <Loader2 size={14} className="cm-spin" /> : <Upload size={14} />}
            {busy ? "Uploading…" : value ? "Replace picture" : "Upload picture"}
          </button>
          {value && !busy && (
            <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => onChange("")}>
              <Trash2 size={14} /> Remove
            </button>
          )}
          <small>or drop a JPG, PNG or WebP here (up to 5 MB)</small>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            take(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="cm-upload-err" role="alert">{error}</p>}
      {note && !error && <p className="cm-hint">{note}</p>}
    </div>
  );
}

const LINKS = {
  public: [
    ["Marketplace", "/discover-marketplace"],
    ["Browse ReMakers", "/discover-remakers"],
    ["Sign up or log in", "/auth"],
    ["How it works", "/how-it-works"],
    ["About", "/about"],
    ["FAQ", "/faq"],
    ["Become a ReMaker", "/remakers-home"],
  ],
  member: [
    ["Marketplace", "/user-marketplace"],
    ["Donate an item", "/user-donations/new"],
    ["Sell an item", "/user-sell/new"],
    ["Orbit Points", "/user-orbit-points"],
    ["My vouchers", "/user-orbit-points/vouchers"],
    ["ReMakers", "/user-remakers"],
    ["Wishlist", "/user-wishlist"],
  ],
  /* the ReMaker landing page before sign-in */
  remakerPublic: [
    ["Marketplace", "/remaker-marketplace"],
    ["Join as a ReMaker", "/remakers-auth"],
    ["How it works for ReMakers", "/remakers-how-it-works"],
    ["About ReMakers", "/remakers-about"],
    ["ReMaker welcome page", "/remakers-before-marketplace"],
  ],
  remaker: [
    ["Marketplace", "/remaker-marketplace"],
    ["Add a product", "/remaker-products/new"],
    ["Add portfolio work", "/remaker-portfolio/new"],
    ["Analytics", "/remaker-analytics"],
    ["Earnings", "/remaker-earnings"],
    ["ReMaker welcome page", "/remakers-before-marketplace"],
  ],
};
/* the pages that fit this side and audience */
const groupFor = (side, aud) => {
  if (side === "remaker") return aud === "ReMakers" ? "remaker" : aud === "Visitors only" ? "remakerPublic" : "remakerAll";
  return aud === "Signed-in members" ? "member" : aud === "Visitors only" ? "public" : "userAll";
};
const pagesFor = (group) => {
  if (group === "userAll") return dedupe([...LINKS.public, ...LINKS.member]);
  if (group === "remakerAll") return dedupe([...LINKS.remakerPublic, ...LINKS.remaker]);
  return LINKS[group];
};
const dedupe = (rows) => rows.filter((r, i, all) => all.findIndex((x) => x[1] === r[1] || x[0] === r[0]) === i);

/* "Buy now" link for a product: /buy/<id> opens the product page, or asks the visitor to log in
   first and brings them back to it. ReMaker-side banners use ?as=remaker so the ReMaker login is used. */
export const buyLink = (id, side) => `/buy/${id}${side === "remaker" ? "?as=remaker" : ""}`;

/* Pages that fit this audience, the products already boosted on Home, and a product search.
   Clicking one fills the link (and the button text when it is still the default). */
export function LinkSuggestions({ side = "user", audience, current, onPick }) {
  const group = groupFor(side, audience);
  const { data: spot } = useSpotlight();
  const [q, setQ] = useState("");
  const [found, setFound] = useState([]);
  useEffect(() => {
    if (q.trim().length < 2) {
      setFound([]);
      return undefined;
    }
    let live = true;
    const t = setTimeout(() => {
      searchSpotlight(q.trim())
        .then((r) => live && setFound(r.slice(0, 6)))
        .catch(() => live && setFound([]));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);
  /* the products boosted on THIS side's Home (Admin › Content › Home spotlight) */
  const boosted = (side === "remaker" ? spot.remaker : spot.user) || [];
  const pickProduct = (p) => onPick(buyLink(p.id, side), "Buy now");

  return (
    <div className="cm-links">
      <span className="cm-links-h"><Link2 size={13} /> Suggested pages</span>
      <div className="cm-chips">
        {pagesFor(group).map(([label, to]) => (
          <button key={to} type="button" className={current === to ? "on" : ""} onClick={() => onPick(to, label)} title={to}>
            {label}
          </button>
        ))}
      </div>
      {boosted.length > 0 && (
        <>
          <span className="cm-links-h">
            <ShoppingBag size={13} /> Buy now: boosted on the {side === "remaker" ? "ReMaker" : "member"} Home
          </span>
          <div className="cm-chips">
            {boosted.map((p) => (
              <button key={p.id} type="button" className={current === buyLink(p.id, side) ? "on" : ""} onClick={() => pickProduct(p)} title={buyLink(p.id, side)}>
                {p.title}
              </button>
            ))}
          </div>
        </>
      )}
      <label className="cm-links-search">
        <Search size={13} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Or find any product for a Buy now button" />
      </label>
      {found.length > 0 && (
        <div className="cm-chips">
          {found.map((p) => (
            <button key={p.id} type="button" onClick={() => pickProduct(p)} title={buyLink(p.id, side)}>
              {p.title}
            </button>
          ))}
        </div>
      )}
      <small className="cm-hint">
        A Buy now button opens the product page. Visitors who are not signed in log in first and come
        straight back to that product.
      </small>
    </div>
  );
}
