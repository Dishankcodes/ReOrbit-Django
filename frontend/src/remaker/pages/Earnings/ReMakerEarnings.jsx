import React from "react";
import { Link } from "react-router-dom";

import EarningsNav from "./EarningsNav";
import { useWallet } from "../../../shared/data/walletStore";
import { BalanceHero, LedgerList, WalletGate } from "../../../shared/components/WalletParts";

import "../../css/ReMakerOrders.css";
import "../../css/ReMakerSales.css";

/* Overview: your real wallet. Earnings come from delivered orders. */
export default function ReMakerEarnings() {
  const wallet = useWallet();
  return (
    <section className="rod rsl">
      <EarningsNav />
      <WalletGate wallet={wallet}>
        {(summary) => (
          <>
            <BalanceHero summary={summary} payoutsTo="/remaker-earnings/payouts" transactionsTo="/remaker-earnings/transactions" />
            <section className="rod-panel">
              <div className="rod-panel-head">
                <h3>Recent transactions</h3>
                <Link to="/remaker-earnings/transactions" className="sls-textbtn">See all</Link>
              </div>
              <LedgerList />
            </section>
          </>
        )}
      </WalletGate>
    </section>
  );
}
