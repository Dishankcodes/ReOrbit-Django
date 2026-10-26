import React from "react";
import {
  Armchair, Home, CookingPot, Shirt, Smartphone, BookOpen, Dumbbell, Lamp, Gem, Baby, Bike, Music, Camera, Watch, Flower2, Hammer,
  Gamepad2, Backpack, Package, Scale, Lock, RotateCcw, Truck, Gift, UsersRound, FileText,
} from "lucide-react";
import { parseBody } from "../../../data/contentStore";

const ICONS = { Armchair, Home, CookingPot, Shirt, Smartphone, BookOpen, Dumbbell, Lamp, Gem, Baby, Bike, Music, Camera, Watch, Flower2, Hammer, Gamepad2, Backpack, Package };
export function CategoryIcon({ name, size = 18 }) {
  const I = ICONS[name] || Package;
  return <I size={size} strokeWidth={1.7} />;
}

const POLICY_ICONS = { Scale, Lock, RotateCcw, Truck, Gift, UsersRound };
export function PolicyIcon({ name, size = 18 }) {
  const I = POLICY_ICONS[name] || FileText;
  return <I size={size} strokeWidth={1.7} />;
}

/* Renders the tiny markup (## heading, - bullet, paragraphs). */
export function Prose({ text }) {
  return (
    <div className="cm-prose">
      {parseBody(text).map((b, i) => (b.type === "h" ? <h4 key={i}>{b.text}</h4>
        : b.type === "ul" ? <ul key={i}>{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
        : <p key={i}>{b.text}</p>))}
    </div>
  );
}
