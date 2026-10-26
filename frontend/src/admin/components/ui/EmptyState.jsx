import React from "react";
import "../../css/states/AdminStates.css";

/* A friendly "nothing here" block. The little orbit picture changes with
   the kind of emptiness, so a search that found nothing does not look like
   an inbox that is simply clear.
     <EmptyState icon={SearchX} title="No results" text="..." action={<button/>} />
   `art` can be set by hand: "search" | "clear" | "box" | "orbit".
   Without it the icon decides. `compact` makes it smaller for tight spots. */
const ART_FOR_ICON = {
  SearchX: "search", Search: "search",
  CircleCheck: "clear", CheckCircle2: "clear", BellOff: "clear", Inbox: "clear",
  PackageX: "box", Package: "box", ImageOff: "box", Boxes: "box",
};

export function EmptyArt({ art = "orbit", children }) {
  return (
    <div className={`st-art st-art-${art}`} aria-hidden="true">
      <svg viewBox="0 0 200 120" width="200" height="120" fill="none">
        <ellipse className="ring r1" cx="100" cy="62" rx="84" ry="30" />
        <ellipse className="ring r2" cx="100" cy="62" rx="58" ry="21" />
        <circle className="dot d1" cx="26" cy="50" r="5" />
        <circle className="dot d2" cx="168" cy="78" r="4" />
        <circle className="dot d3" cx="132" cy="38" r="3" />
        {art === "search" && <path className="spark" d="M44 26l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />}
        {art === "clear" && <path className="spark" d="M158 24l2.5 5.5 5.5 2.5-5.5 2.5-2.5 5.5-2.5-5.5-5.5-2.5 5.5-2.5z" />}
        {art === "box" && <rect className="spark" x="38" y="82" width="12" height="12" rx="3" />}
      </svg>
      <div className="st-art-core">{children}</div>
    </div>
  );
}

export default function EmptyState({ icon: Icon, title, text, action, art, compact = false }) {
  const kind = art || ART_FOR_ICON[Icon?.displayName] || "orbit";
  return (
    <div className={`ad-empty ${compact ? "is-compact" : ""}`}>
      {Icon && (
        <EmptyArt art={kind}>
          <Icon size={compact ? 20 : 24} strokeWidth={1.6} />
        </EmptyArt>
      )}
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
