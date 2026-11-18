import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ExternalLink } from "lucide-react";

import "./ImageViewer.css";

/* =========================================================
   Click any product / item photo to see it full size.

   Mounted once for the whole app (User, ReMaker and Admin). It listens for clicks on <img>
   and opens the viewer for photos of things: listings, ReMaker products and store items
   (/uploads/listings/…), donations, returns, reviews and support attachments. Profile pictures
   and studio covers are left alone.

   - A photo inside a link or a button (a product card that opens the product page, a gallery
     thumbnail, a remove button) keeps doing that job.
   - A photo inside a clickable table row opens the viewer instead of the row, so the team can
     look at an item before acting on it; clicking anywhere else on the row still opens it.
   - Photos next to each other (a gallery, an order's items) can be stepped through with the
     arrows or the ← → keys.
   - <img data-zoom> forces any image to open; <img data-no-zoom> (or a parent with it) opts out.
   ========================================================= */

const ITEM_PHOTO = /\/(listings|donations|returns|reviews|support)\/[^/?#]+\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i;

function srcOf(img) {
  return img.currentSrc || img.getAttribute("src") || "";
}

export function isItemPhoto(img) {
  if (!img || img.tagName !== "IMG") return false;
  if (img.closest("[data-no-zoom]")) return false;
  if (img.hasAttribute("data-zoom")) return true;
  const src = srcOf(img);
  return ITEM_PHOTO.test(src) || src.startsWith("blob:");
}

/* the photos that belong together with the clicked one */
function galleryFor(img) {
  const box =
    img.closest("[data-gallery]") ||
    img.closest("article, section, li, tr, [role=dialog], aside") ||
    img.parentElement;
  const seen = new Set();
  const list = [];
  for (const el of box ? box.querySelectorAll("img") : [img]) {
    if (!isItemPhoto(el)) continue;
    const src = srcOf(el);
    if (!src || seen.has(src)) continue;
    seen.add(src);
    list.push({ src, alt: el.getAttribute("alt") || "" });
  }
  if (!list.length) list.push({ src: srcOf(img), alt: img.getAttribute("alt") || "" });
  const index = Math.max(0, list.findIndex((p) => p.src === srcOf(img)));
  return { list, index };
}

export default function ImageViewer() {
  const [view, setView] = useState(null); // { list, index }

  useEffect(() => {
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const img = event.target.closest?.("img");
      if (!isItemPhoto(img)) return;
      // links and buttons keep doing their own job (product cards, gallery thumbnails, remove buttons)
      if (img.closest("a[href], button, label, [role=button], [role=link], [contenteditable=true]")) return;
      event.preventDefault();
      event.stopPropagation();
      setView(galleryFor(img));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const close = useCallback(() => setView(null), []);
  const step = useCallback(
    (by) =>
      setView((v) => (v && v.list.length > 1 ? { ...v, index: (v.index + by + v.list.length) % v.list.length } : v)),
    [],
  );

  useEffect(() => {
    if (!view) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
    };
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = before;
    };
  }, [view, close, step]);

  if (!view) return null;
  const photo = view.list[view.index];
  const many = view.list.length > 1;

  return createPortal(
    <div className="iv" role="dialog" aria-modal="true" aria-label="Photo" onClick={close}>
      <div className="iv-bar" onClick={(e) => e.stopPropagation()}>
        <span>{many ? `${view.index + 1} / ${view.list.length}` : photo.alt || "Photo"}</span>
        <div>
          {!photo.src.startsWith("blob:") && (
            <a href={photo.src} target="_blank" rel="noreferrer" aria-label="Open the original in a new tab">
              <ExternalLink size={18} />
            </a>
          )}
          <button type="button" onClick={close} aria-label="Close" autoFocus>
            <X size={20} />
          </button>
        </div>
      </div>

      {many && (
        <button
          type="button"
          className="iv-nav prev"
          aria-label="Previous photo"
          onClick={(e) => {
            e.stopPropagation();
            step(-1);
          }}
        >
          <ChevronLeft size={26} />
        </button>
      )}

      <img
        className="iv-img"
        src={photo.src}
        alt={photo.alt}
        data-no-zoom
        onClick={(e) => e.stopPropagation()}
      />

      {many && (
        <button
          type="button"
          className="iv-nav next"
          aria-label="Next photo"
          onClick={(e) => {
            e.stopPropagation();
            step(1);
          }}
        >
          <ChevronRight size={26} />
        </button>
      )}

      {many && (
        <div className="iv-strip" onClick={(e) => e.stopPropagation()}>
          {view.list.map((p, i) => (
            <button
              type="button"
              key={p.src}
              className={i === view.index ? "on" : ""}
              aria-label={`Photo ${i + 1}`}
              onClick={() => setView((v) => ({ ...v, index: i }))}
            >
              <img src={p.src} alt="" data-no-zoom />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
