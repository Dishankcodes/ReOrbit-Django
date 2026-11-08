import React from "react";
import { Link } from "react-router-dom";

import { salesApi } from "../../../api/orders";
import SellerOrders from "../../../shared/components/SellerOrders";

import "../../css/ReMakerOrders.css";

/* Real orders for this ReMaker's products. Paged by the server, one row updates at a time. */
export default function ReMakerSales() {
  return (
    <section className="rod rsl">
      <div className="rod-intro">
        <div>
          <h2>Orders from customers</h2>
          <p>Pack each order, add the courier details, and mark it delivered.</p>
        </div>
        <Link to="/remaker-earnings" className="rod-btn ghost">View earnings</Link>
      </div>
      <SellerOrders api={salesApi} role="remaker" accent="#7a5230" />
    </section>
  );
}
