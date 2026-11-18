import React from "react";

export const SECTIONS = [
  { key: "account", label: "Account", note: "Name, handle and email" },
  { key: "notifications", label: "Notifications", note: "What we tell you about" },
  { key: "payouts", label: "Payouts", note: "How you get paid" },
  { key: "security", label: "Sign-in and security", note: "How you sign in, alerts" },
  { key: "danger", label: "Delete account", note: "30 days to change your mind" },
];

export default function SettingsNav({ active, onSelect, dirty }) {
  return (
    <nav className="set-nav" aria-label="Settings sections">
      {SECTIONS.map((item) => (
        <button
          type="button"
          key={item.key}
          className={`${active === item.key ? "active" : ""} ${item.key === "danger" ? "danger" : ""}`}
          aria-current={active === item.key ? "page" : undefined}
          onClick={() => onSelect(item.key)}
        >
          <span>
            <strong>
              {item.label}
              {dirty[item.key] && <i title="Unsaved changes" aria-label="Unsaved changes" />}
            </strong>
            <small>{item.note}</small>
          </span>
        </button>
      ))}
    </nav>
  );
}
