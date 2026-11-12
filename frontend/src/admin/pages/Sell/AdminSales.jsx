import React from "react";

import { adminOrdersApi } from "../../../api/orders";
import SellerOrders from "../../../shared/components/SellerOrders";

/* Orders for products sold by ReOrbit itself (the "ReOrbit Store" tab in Products). */
export default function AdminSales() {
  return (
    <div className="au-page">
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Store sales</h1>
        <p style={{ margin: "4px 0 0", opacity: 0.7 }}>Pack, ship and deliver orders for ReOrbit store products.</p>
      </header>
      <SellerOrders api={adminOrdersApi} role="admin" accent="#2a4d3a" fixedType="platform" detailPath={(id) => `/admin-sell/sales/${id}`} />
    </div>
  );
}
