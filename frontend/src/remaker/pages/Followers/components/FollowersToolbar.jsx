import React from "react";

export default function FollowersToolbar({
  filter,
  onFilter,
  counts,
  query,
  onQuery,
  sort,
  onSort,
  view,
  onView,
}) {
  const filters = [
    { key: "all", label: "Everyone", count: counts.all },
    { key: "new", label: "New this month", count: counts.new },
    { key: "customers", label: "Customers", count: counts.customers },
    { key: "engaged", label: "Highly engaged", count: counts.engaged },
    { key: "makers", label: "ReMakers", count: counts.makers },
  ];

  return (
    <div className="fol-toolbar">
      <div className="fol-chips" role="group" aria-label="Filter followers">
        {filters.map((item) => (
          <button
            type="button"
            key={item.key}
            className={filter === item.key ? "active" : ""}
            aria-pressed={filter === item.key}
            onClick={() => onFilter(item.key)}
          >
            {item.label}
            <span>{item.count}</span>
          </button>
        ))}
      </div>

      <div className="fol-controls">
        <label className="fol-search">
          <span className="sr-only">Search followers</span>
          <input
            type="text"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search by name or city"
          />
        </label>

        <label className="fol-select">
          <span className="sr-only">Sort followers</span>
          <select value={sort} onChange={(event) => onSort(event.target.value)}>
            <option value="recent">Newest followers</option>
            <option value="oldest">Longest following</option>
            <option value="name">Name A to Z</option>
            <option value="engaged">Most engaged</option>
          </select>
        </label>

        <div className="fol-view" role="group" aria-label="Layout">
          <button
            type="button"
            className={view === "grid" ? "active" : ""}
            aria-pressed={view === "grid"}
            onClick={() => onView("grid")}
          >
            Cards
          </button>
          <button
            type="button"
            className={view === "list" ? "active" : ""}
            aria-pressed={view === "list"}
            onClick={() => onView("list")}
          >
            List
          </button>
        </div>
      </div>
    </div>
  );
}
