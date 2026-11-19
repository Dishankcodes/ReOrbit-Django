import React, { useEffect, useState } from "react";

import { mediaUrl } from "../../api/profile";

export const DEFAULT_AVATAR = "/images/default-avatar.png";

/* Round photo that always fills its circle. Anyone without a photo, or with a
   broken link, gets the ReOrbit default picture. */
export default function Avatar({ src, name = "" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const url = src && !failed ? mediaUrl(src) : DEFAULT_AVATAR;
  return (
    <span className="msgx-avatar">
      <img
        src={url}
        alt={name ? `${name}'s photo` : ""}
        loading="lazy"
        draggable="false"
        onError={() => (url === DEFAULT_AVATAR ? null : setFailed(true))}
      />
    </span>
  );
}
