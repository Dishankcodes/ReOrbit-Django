import React, { useState } from "react";

const initialsOf = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

/* Round photo, or the person's initials when there is no photo (ReOrbit teams, broken links) */
export default function Avatar({ src, name }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="rvw-avatar">
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> : <b>{initialsOf(name)}</b>}
    </span>
  );
}
