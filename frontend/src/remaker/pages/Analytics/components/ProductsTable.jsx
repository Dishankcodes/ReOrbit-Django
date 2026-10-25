import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fmtDelta, fmtNumber, fmtPercent, formatPrice } from "./format";

const COLUMNS = [
  { key: "revenue", label: "Earnings" },
  { key: "orders", label: "Orders" },
  { key: "views", label: "Views" },
  { key: "saves", label: "Saves" },
  { key: "conv", label: "Conversion" },
];

export default function ProductsTable({ products }) {
  const [sort, setSort] = useState("revenue");

  const rows = useMemo(() => [...products].sort((a, b) => b[sort] - a[sort]), [products, sort]);
  const topRevenue = Math.max(...products.map((item) => item.revenue), 1);

  return (
    <section className="ana-card ana-products">
      <header className="ana-card-head">
        <div>
          <h3>Your products</h3>
          <p>Click a column to sort. Conversion is orders divided by views.</p>
        </div>
        <Link to="/remaker-products" className="ana-link">
          Manage products
        </Link>
      </header>

      <div className="ana-table-wrap">
        <table className="ana-table">
          <thead>
            <tr>
              <th>Product</th>
              {COLUMNS.map((column) => (
                <th className="num" key={column.key} aria-sort={sort === column.key ? "descending" : "none"}>
                  <button type="button" className={sort === column.key ? "active" : ""} onClick={() => setSort(column.key)}>
                    {column.label}
                    {sort === column.key && <span aria-hidden="true"> ↓</span>}
                  </button>
                </th>
              ))}
              <th className="num">Change</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td data-label="Product">
                  <Link to={`/remaker-products/${row.id}/edit`} className="ana-product-cell">
                    <b className="rank">{index + 1}</b>
                    <img src={row.image} alt="" />
                    <span>
                      <strong>{row.title}</strong>
                      <small>
                        {row.category} · {formatPrice(row.price)}
                      </small>
                    </span>
                  </Link>
                </td>
                <td className="num strong" data-label="Earnings">
                  {formatPrice(row.revenue)}
                  <i className="mini" style={{ width: `${(row.revenue / topRevenue) * 100}%` }} />
                </td>
                <td className="num" data-label="Orders">
                  {fmtNumber(row.orders)}
                </td>
                <td className="num" data-label="Views">
                  {fmtNumber(row.views)}
                </td>
                <td className="num" data-label="Saves">
                  {fmtNumber(row.saves)}
                </td>
                <td className="num" data-label="Conversion">
                  {fmtPercent(row.conv, 2)}
                </td>
                <td className="num" data-label="Change">
                  <span className={`ana-chip ${row.delta === null ? "" : row.delta >= 0 ? "up" : "down"}`}>
                    {row.delta === null ? "New" : fmtDelta(row.delta)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
