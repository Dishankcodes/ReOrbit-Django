import React, { useState } from "react";

import EarningsNav from "./EarningsNav";
import { LedgerList } from "../../../shared/components/WalletParts";

import "../../css/ReMakerOrders.css";
import "../../css/ReMakerSales.css";

const FILTERS = [
  ["", "All"],
  ["Earning", "Earnings"],
  ["Payout", "Payouts"],
  ["Release", "Returned"],
];

export default function ReMakerTransactions() {
  const [kind, setKind] = useState("");
  return (
    <section className="rod rsl">
      <EarningsNav />
      <section className="rod-panel">
        <div className="rod-panel-head">
          <h3>Transactions</h3>
          <div className="wlt-method" role="radiogroup" aria-label="Filter">
            {FILTERS.map(([k, l]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                className={kind === k ? "on" : ""}
                onClick={() => setKind(k)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <LedgerList key={kind} kind={kind} />
      </section>
    </section>
  );
}
