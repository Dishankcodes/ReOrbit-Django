import React, { useState } from "react";

const FALLBACK =
  "https://images.pexels.com/photos/5825540/pexels-photo-5825540.jpeg?auto=compress&cs=tinysrgb&w=1000";
/* the person placeholder, for profile pictures */
export const DEFAULT_AVATAR = "/images/default-avatar.png";

/* Image that falls back to a neutral placeholder if it is missing or fails to load.
   Profile pictures (a class name containing "avatar", or `avatar`) fall back to the default person
   picture instead of a stock photo. */
export default function SafeImage({ src, alt = "", className = "", avatar = false, fallback, ...rest }) {
  const [failed, setFailed] = useState(false);
  const placeholder = fallback || (avatar || /avatar/i.test(className) ? DEFAULT_AVATAR : FALLBACK);

  return (
    <img
      src={failed || !src ? placeholder : src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
