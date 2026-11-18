import React from "react";

/* ReOrbit's globe-and-orbit mark (no wordmark). `size` in px; it sits where the old leaf icon was. */
export default function BrandMark({ size = 28, className = "" }) {
  return (
    <img
      src="/images/brand/reorbit-globe-192.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={`brand-mark ${className}`}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block", flex: "none" }}
      decoding="async"
    />
  );
}
