import React from "react";
import { Link } from "react-router-dom";

export default function EmptyState({ icon: Icon, title, text, actionLabel, to, onAction }) {
  return (
    <div className="dn-card dn-empty">
      <div className="dn-empty-icon">{Icon && <Icon size={30} />}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {actionLabel && to && (
        <Link to={to} className="dn-btn">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && (
        <button type="button" className="dn-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
