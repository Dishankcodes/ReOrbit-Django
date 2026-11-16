import React from "react";

import { adminOrdersApi } from "../../../api/orders";
import SellerOrders from "../../../shared/components/SellerOrders";
import SellNav from "./components/SellNav";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/orders/AdminOrders.css";
import "../../css/shop/AdminShop.css";
import "../../css/sell/AdminSell.css";

/* Orders for products sold by ReOrbit itself (the "ReOrbit Store" tab in Products).
   Packing, shipping, delivery, cash on delivery and returns all run on the server. */
export default function AdminSales() {
  return (
    <div className="au-page sh-page">
      <SellNav />
      <header style={{ margin: "4px 0 16px" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Store sales</h1>
        <p style={{ margin: "4px 0 0", opacity: 0.7 }}>
          Pack, ship and deliver orders for ReOrbit store products.
        </p>
      </header>
      <SellerOrders
        api={adminOrdersApi}
        role="admin"
        variant="admin"
        accent="#2a4d3a"
        fixedType="platform"
        detailPath={(id) => `/admin-sell/sales/${id}`}
      />
    </div>
  );
}
