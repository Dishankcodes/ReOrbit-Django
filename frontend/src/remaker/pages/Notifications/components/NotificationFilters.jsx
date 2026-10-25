import React from "react";

import { CATEGORIES } from "../../../data/notificationsStore";

export default function NotificationFilters({ filter, onFilter, counts }) {
  const tabs = [
    { key: "all", label: "All", count: counts.all },
    { key: "unread", label: "Unread", count: counts.unread },
    ...CATEGORIES.map((item) => ({ key: item.key, label: item.label, count: counts[item.key] || 0 })),
  ];

  return (
    <div className="ntf-tabs" role="tablist" aria-label="Filter notifications">
      {tabs.map((item) => (
        <button
          type="button"
          role="tab"
          aria-selected={filter === item.key}
          className={filter === item.key ? "active" : ""}
          key={item.key}
          onClick={() => onFilter(item.key)}
        >
          {item.label}
          <span>{item.count}</span>
        </button>
      ))}
    </div>
  );
}
