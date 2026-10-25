import React, { useState } from "react";
import { getInitials } from "../../utils/format";

/* Photo if we have one, otherwise a soft green initials tile. */
export default function UserAvatar({ name, src, size = 40, rounded = "12px" }) {
  const [failed, setFailed] = useState(false);
  const style = {
    width: size,
    height: size,
    flex: `0 0 ${size}px`,
    borderRadius: rounded,
    fontSize: Math.max(11, Math.round(size * 0.34)),
  };

  if (src && !failed) {
    return (
      <img
        className="ad-avatar"
        style={style}
        src={src}
        alt={name}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className="ad-avatar ad-avatar-initials" style={style} aria-label={name}>
      {getInitials(name)}
    </span>
  );
}
