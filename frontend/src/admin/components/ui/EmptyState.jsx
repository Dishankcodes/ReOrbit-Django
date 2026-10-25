import React from "react";

export default function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="ad-empty">
      {Icon && (
        <div className="ad-empty-icon">
          <Icon size={22} strokeWidth={1.6} />
        </div>
      )}
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
