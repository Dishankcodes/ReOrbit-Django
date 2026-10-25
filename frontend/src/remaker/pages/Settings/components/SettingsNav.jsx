import React from "react";

export const SECTIONS = [
  { key: "account", label: "Account", note: "Name, contact and sign-in" },
  { key: "studio", label: "Studio", note: "Orders, pickup and vacation" },
  {
    key: "notifications",
    label: "Notifications",
    note: "What we tell you, and how",
  },
  { key: "payouts", label: "Payouts", note: "How you get paid" },
  {
    key: "security",
    label: "Privacy and security",
    note: "Visibility, devices, blocked",
  },
  { key: "danger", label: "Close account", note: "Deactivate or delete" },
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
              {dirty[item.key] && (
                <i title="Unsaved changes" aria-label="Unsaved changes" />
              )}
            </strong>
            <small>{item.note}</small>
          </span>
        </button>
      ))}
    </nav>
  );
}
