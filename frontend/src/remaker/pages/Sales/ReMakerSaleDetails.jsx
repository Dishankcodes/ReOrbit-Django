import React from "react";

import { salesApi } from "../../../api/orders";
import SellerOrderDetails from "../../../shared/components/SellerOrderDetails";

import "../../css/ReMakerOrders.css";

/* One order for this ReMaker's product: status, courier, returns and payment, with every action. */
export default function ReMakerSaleDetails() {
  return (
    <section className="rod rsl">
      <SellerOrderDetails api={salesApi} role="remaker" accent="#421517" listPath="/remaker-sales" listLabel="Orders from customers" />
    </section>
  );
}
