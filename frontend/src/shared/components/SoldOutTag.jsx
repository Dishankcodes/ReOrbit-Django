import React from "react";
import "./SoldOutTag.css";

/* The "SOLD OUT" label that goes over a product picture on every side (member, ReMaker, admin).
   Put it inside the picture's box (position: relative is set for you) and pass `show`. */
export default function SoldOutTag({ show, size = "md" }) {
  if (!show) return null;
  return (
    <span className={`so-tag so-${size}`} role="status">
      <span>Sold out</span>
    </span>
  );
}

/* class to put on the picture box so the picture itself dims when sold out */
export const soldOutClass = (show) => (show ? "so-dim" : "");
