import React from "react";
import { Package, X } from "lucide-react";

import "./AboutCard.css";

/* "About" chip at the top of a support form, like the one in a chat: which order (or listing) the
   message is about. The X removes it, so the ticket is about nothing in particular. */
export default function AboutCard({ id, title, image, onClear }) {
  if (!id) return null;
  return (
    <div className="abc" role="group" aria-label={`About ${id}`}>
      <span className="abc-img" aria-hidden="true">
        {image ? <img src={image} alt="" /> : <Package size={18} />}
      </span>
      <span className="abc-text">
        <small>About</small>
        <strong>
          {id}
          {title ? ` · ${title}` : ""}
        </strong>
      </span>
      {onClear && (
        <button type="button" className="abc-x" onClick={onClear} aria-label={`Not about ${id}`} title="Remove">
          <X size={15} />
        </button>
      )}
    </div>
  );
}
