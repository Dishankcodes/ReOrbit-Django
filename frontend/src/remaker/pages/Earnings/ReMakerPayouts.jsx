import React from "react";

import EarningsNav from "./EarningsNav";
import { useWallet } from "../../../shared/data/walletStore";
import {
  PayoutsPanel,
  WalletGate,
} from "../../../shared/components/WalletParts";

import "../../css/ReMakerOrders.css";
import "../../css/ReMakerSales.css";

export default function ReMakerPayouts() {
  const wallet = useWallet();
  return (
    <section className="rod rsl">
      <EarningsNav />
      <WalletGate wallet={wallet}>
        {(summary) => <PayoutsPanel summary={summary} reload={wallet.reload} />}
      </WalletGate>
    </section>
  );
}
