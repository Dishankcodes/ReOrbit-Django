import React from "react";

import { useWallet } from "../../../shared/data/walletStore";
import {
  BalanceHero,
  LedgerList,
  PayoutsPanel,
  WalletGate,
} from "../../../shared/components/WalletParts";
import Crumbs from "../../components/ui/Crumbs";

/* A member's earnings from sales and payouts. Same wallet as a ReMaker's, one page. */
export default function UserWallet() {
  const wallet = useWallet();
  return (
    <div className="rod rsl usl-wallet">
      <Crumbs
        items={[
          { label: "Sell", to: "/user-sell" },
          { label: "Wallet & payouts" },
        ]}
      />
      <WalletGate wallet={wallet}>
        {(summary) => (
          <>
            <BalanceHero summary={summary} payoutsTo="/user-wallet" />
            <PayoutsPanel summary={summary} reload={wallet.reload} />
            <section className="rod-panel">
              <div className="rod-panel-head">
                <h3>Transactions</h3>
              </div>
              <LedgerList />
            </section>
          </>
        )}
      </WalletGate>
    </div>
  );
}
