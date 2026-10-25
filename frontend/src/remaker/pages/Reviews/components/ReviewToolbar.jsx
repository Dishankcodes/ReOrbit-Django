import React from "react";

export default function ReviewToolbar({
  tab,
  onTab,
  counts,
  query,
  onQuery,
  product,
  onProduct,
  products,
  sort,
  onSort,
}) {
  const tabs = [
    { key: "all", label: "All reviews", count: counts.all },
    { key: "needs", label: "Needs reply", count: counts.needs },
    { key: "replied", label: "Replied", count: counts.replied },
    { key: "photos", label: "With photos", count: counts.photos },
    { key: "reported", label: "Reported", count: counts.reported },
  ];

  return (
    <div className="rvp-toolbar">
      <div className="rvp-tabs" role="tablist" aria-label="Filter reviews">
        {tabs.map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={tab === item.key ? "active" : ""}
            key={item.key}
            onClick={() => onTab(item.key)}
          >
            {item.label}
            <span>{item.count}</span>
          </button>
        ))}
      </div>

      <div className="rvp-controls">
        <label className="rvp-search">
          <span className="sr-only">Search reviews</span>
          <input
            type="text"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search by customer or words in a review"
          />
        </label>

        <label className="rvp-select">
          <span className="sr-only">Product</span>
          <select value={product} onChange={(event) => onProduct(event.target.value)}>
            <option value="all">All products</option>
            {products.map((item) => (
              <option key={item.productId} value={item.productId}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        <label className="rvp-select">
          <span className="sr-only">Sort</span>
          <select value={sort} onChange={(event) => onSort(event.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest rating</option>
            <option value="lowest">Lowest rating</option>
            <option value="helpful">Most helpful</option>
          </select>
        </label>
      </div>
    </div>
  );
}
