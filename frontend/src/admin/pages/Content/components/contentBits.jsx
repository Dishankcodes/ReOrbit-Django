import React from "react";
import { Scale, Lock, RotateCcw, Truck, Gift, UsersRound, FileText } from "lucide-react";
export { CategoryIcon } from "../../../../shared/categoryIcons";
import { parseBody } from "../../../data/contentStore";

const POLICY_ICONS = { Scale, Lock, RotateCcw, Truck, Gift, UsersRound };
export function PolicyIcon({ name, size = 18 }) {
  const I = POLICY_ICONS[name] || FileText;
  return <I size={size} strokeWidth={1.7} />;
}

/* Renders the tiny markup (## heading, - bullet, paragraphs). */
export function Prose({ text }) {
  return (
    <div className="cm-prose">
      {parseBody(text).map((b, i) =>
        b.type === "h" ? (
          <h4 key={i}>{b.text}</h4>
        ) : b.type === "ul" ? (
          <ul key={i}>
            {b.items.map((it, j) => (
              <li key={j}>{it}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.text}</p>
        ),
      )}
    </div>
  );
}
