import React, { useState } from "react";

const FALLBACK = "/images/products/default-item.jpg";

/* Image that falls back to a neutral placeholder if it fails to load. */
export default function SafeImage({ src, alt = "", className = "", ...rest }) {
  const [failed, setFailed] = useState(false);

  return (
    <img
      src={failed || !src ? FALLBACK : src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
