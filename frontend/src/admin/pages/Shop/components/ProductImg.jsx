import React, { useState } from "react";

/* Product photo with a safe fallback if the file is missing. */
export default function ProductImg({ src, alt, className = "" }) {
  const [broken, setBroken] = useState(false);
  return <img className={className} src={broken || !src ? "/images/products/default-item.jpg" : src} alt={alt} loading="lazy" onError={() => setBroken(true)} />;
}
