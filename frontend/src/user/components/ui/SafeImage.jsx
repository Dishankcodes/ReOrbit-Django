import React, { useState } from "react";

const FALLBACK = "https://images.pexels.com/photos/5825540/pexels-photo-5825540.jpeg?auto=compress&cs=tinysrgb&w=1000";

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
