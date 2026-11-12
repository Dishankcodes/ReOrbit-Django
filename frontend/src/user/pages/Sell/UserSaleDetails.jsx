import React from "react";

import { salesApi } from "../../../api/orders";
import SellerOrderDetails from "../../../shared/components/SellerOrderDetails";

import "../../css/shared/ui-base.css";

/* One order a member sold: status, courier, returns and payment, with every action. */
export default function UserSaleDetails() {
  return (
    <div className="dn sl">
      <SellerOrderDetails
        api={salesApi}
        role="user"
        accent="#2a4d3a"
        listPath="/user-sell/sales"
        listLabel="Sales & orders"
      />
    </div>
  );
}
