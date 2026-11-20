import React, { useEffect, useRef, useState } from "react";
import { Check, Copy, Link2, MessageCircle, Share2, X } from "lucide-react";

import { shareTrackingApi } from "../../api/orders";
import "./ShareTracking.css";

/* "Share tracking": not at home? Send the delivery to family or a neighbour. Makes a signed link to
   the public /track page (no login needed, nothing private on it) and offers WhatsApp, copy, or the
   phone's own share sheet. `side` is "me" for the buyer, "sales" for the seller. */
export default function ShareTracking({ side = "me", orderId, itemTitle = "", className = "", label = "Share tracking" }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const text = side === "sales"
    ? `Track order ${orderId}${itemTitle ? ` (${itemTitle})` : ""} on ReOrbit:`
    : `I'm not at home. Can you receive my ReOrbit parcel${itemTitle ? ` (${itemTitle})` : ""}? Track it here:`;

  const start = async () => {
    setError("");
    setCopied(false);
    if (link) {
      setOpen((o) => !o);
      return;
    }
    setBusy(true);
    try {
      const l = await shareTrackingApi.link(side, orderId);
      setLink(l);
      setOpen(true);
    } catch (e) {
      setError(e.message || "Couldn't make a link. Please try again.");
      setOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
    } catch {
      setError("Couldn't copy. Select the link and copy it.");
    }
  };

  const native = async () => {
    try {
      await navigator.share({ title: `ReOrbit order ${orderId}`, text, url: link.url });
      setOpen(false);
    } catch {
      /* closed the share sheet */
    }
  };

  return (
    <div className="shtr" ref={box}>
      <button type="button" className={className || "dn-btn dn-btn--ghost"} onClick={start} disabled={busy}
        aria-expanded={open} aria-haspopup="dialog">
        <Share2 size={15} /> {busy ? "Making link…" : label}
      </button>
      {open && (
        <div className="shtr-pop" role="dialog" aria-label="Share tracking">
          <div className="shtr-head">
            <strong>Share this delivery</strong>
            <button type="button" className="shtr-x" onClick={() => setOpen(false)} aria-label="Close">
              <X size={15} />
            </button>
          </div>
          {error ? (
            <p className="shtr-error" role="alert">{error}</p>
          ) : link && (
            <>
              <p className="shtr-note">
                {side === "sales"
                  ? "Anyone with this link sees the delivery status and tracking, without signing in."
                  : "Not at home? Send it to family or a neighbour so they can receive it."}{" "}
                No address, phone or price is shown. Works for {link.days} days.
              </p>
              <div className="shtr-url">
                <Link2 size={14} />
                <input value={link.url} readOnly onFocus={(e) => e.target.select()} aria-label="Tracking link" />
              </div>
              <div className="shtr-actions">
                <a className="shtr-wa" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${link.url}`)}`}
                  target="_blank" rel="noreferrer">
                  <MessageCircle size={15} /> WhatsApp
                </a>
                <button type="button" onClick={copy}>
                  {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy link"}
                </button>
                {typeof navigator !== "undefined" && navigator.share && (
                  <button type="button" onClick={native}>
                    <Share2 size={15} /> More
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
