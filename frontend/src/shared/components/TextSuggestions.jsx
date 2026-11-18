import React from "react";
import "./TextSuggestions.css";

/* Tap-to-add sentences under a text box. Tapping adds the sentence, tapping again takes it out.
   Pass the sentences (`items`), the current text and a setter; `max` keeps it inside the box's limit. */
export default function TextSuggestions({ items, value, onChange, max = 1000, label = "Tap to add:", tone = "" }) {
  if (!items?.length) return null;
  const text = value || "";
  const toggle = (line) =>
    onChange(
      text.includes(line)
        ? text.replace(line, "").replace(/\s{2,}/g, " ").trim()
        : `${text.trim()} ${line}`.trim().slice(0, max),
    );
  return (
    <div className={`txs ${tone ? `txs--${tone}` : ""}`} aria-label="Suggested sentences">
      <small>{label}</small>
      {items.map((line) => (
        <button key={line} type="button" className={text.includes(line) ? "on" : ""} onClick={() => toggle(line)}>
          {line}
        </button>
      ))}
    </div>
  );
}

/* ready-made sets */
export const BIO_IDEAS = {
  user: [
    "I love giving pre-loved things a second life.",
    "Decluttering my home one item at a time.",
    "Always on the lookout for good second-hand finds.",
    "Happy to answer questions about my listings.",
    "I donate what I no longer use.",
  ],
  remaker: [
    "I turn rescued materials into one-of-a-kind pieces.",
    "Every piece is handmade in my studio.",
    "I work mostly with reclaimed wood and fabric.",
    "Custom orders are welcome. Message me!",
    "Nothing goes to waste in my workshop.",
  ],
};
