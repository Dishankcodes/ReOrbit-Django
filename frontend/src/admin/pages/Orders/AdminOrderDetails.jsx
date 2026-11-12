import React from "react";
import { useLocation } from "react-router-dom";

import { adminOrdersApi } from "../../../api/orders";
import SellerOrderDetails from "../../../shared/components/SellerOrderDetails";

/* One order, for admin: every order on the platform (/admin-orders/:id) or a ReOrbit store sale
   (/admin-sell/sales/:id). Both read the same admin order endpoint. */
export default function AdminOrderDetails() {
  const { pathname } = useLocation();
  const store = pathname.startsWith("/admin-sell/sales");
  return (
    <div className="au-page">
      <SellerOrderDetails
        api={adminOrdersApi}
        role="admin"
        accent="#2a4d3a"
        listPath={store ? "/admin-sell/sales" : "/admin-orders"}
        listLabel={store ? "Store sales" : "Orders"}
      />
    </div>
  );
}
