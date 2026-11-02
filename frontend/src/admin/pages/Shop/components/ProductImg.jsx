import React, { useState } from "react";

/* Product photo with a safe fallback if the file is missing. */
export default function ProductImg({ src, alt, className = "" }) {
  const [broken, setBroken] = useState(false);
  return (
    <img
      className={className}
      src={broken || !src ? "https://images.pexels.com/photos/8251682/pexels-photo-8251682.jpeg?auto=compress&cs=tinysrgb&w=1000" : src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}
