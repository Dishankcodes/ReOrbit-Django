import React from "react";

import { adminOrdersApi } from "../../../api/orders";
import SellerOrders from "../../../shared/components/SellerOrders";

/* Every paid or pay-on-delivery order on the platform. Needs the "orders" module. */
export default function AdminOrders() {
  return (
    <div className="au-page">
      <header style={{ marginBottom: 16 }}>
        <p style={{ margin: "4px 0 0", opacity: 0.7 }}>
          Follow every order. Move ReOrbit store orders forward, or step in when
          a seller can&apos;t.
        </p>
      </header>
      <SellerOrders
        api={adminOrdersApi}
        role="admin"
        accent="#2a4d3a"
        detailPath={(id) => `/admin-orders/${id}`}
      />
    </div>
  );
}
