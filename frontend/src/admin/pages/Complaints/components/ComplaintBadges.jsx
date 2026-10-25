import React from "react";
import { UserRound, Palette, ShoppingBag, MessageSquareWarning, Flag, AlarmClock, Clock3, Star } from "lucide-react";
import UserAvatar from "../../../components/ui/UserAvatar";

export const TYPE_ICON = { User: UserRound, ReMaker: Palette, Product: ShoppingBag, Review: MessageSquareWarning };
export const TYPE_LABEL = { User: "User", ReMaker: "ReMaker", Product: "Product", Review: "Review" };

export function TypeChip({ type }) {
  const Icon = TYPE_ICON[type];
  return <span className={`cp-type ${type.toLowerCase()}`}><Icon size={11} /> {TYPE_LABEL[type]}</span>;
}

export function PriorityChip({ priority }) {
  return <span className={`cp-pri ${priority.toLowerCase()}`}><Flag size={11} /> {priority}</span>;
}

export const hoursText = (h) => (h < 48 ? `${Math.max(1, h)} h` : `${Math.round(h / 24)} days`);

/* “Overdue 5 h” or “Due in 20 h” for complaints still being worked on. */
export function SlaChip({ c }) {
  if (!c.sla) return null;
  return c.sla.overdue
    ? <span className="cp-sla overdue"><AlarmClock size={12} /> Overdue {hoursText(c.sla.overdueH)}</span>
    : <span className="cp-sla"><Clock3 size={12} /> Due in {hoursText(c.sla.leftH)}</span>;
}

export function Stars({ n }) {
  return <span className="cp-stars" aria-label={`${n} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={13} className={i <= n ? "on" : ""} />)}</span>;
}

/* Thumbnail for whatever was reported. */
export function TargetThumb({ t, size = 44 }) {
  if (t.type === "Product") return <img src={t.image} alt="" className="cp-thumb" style={{ width: size, height: size }} />;
  if (t.type === "Review") return <span className="cp-thumb cp-review-tile" style={{ width: size, height: size }}><MessageSquareWarning size={Math.round(size * 0.42)} /></span>;
  return <UserAvatar name={t.name} src={t.image} size={size} rounded="12px" />;
}

export function TargetCell({ t }) {
  return (
    <div className="cp-target">
      <TargetThumb t={t} />
      <div>
        <strong>{t.name}</strong>
        <span>{t.sub}</span>
      </div>
    </div>
  );
}
