import React, { useState } from "react";
import { Link } from "react-router-dom";

import { AccountModal, inr } from "../../../../shared/components/WalletParts";
import { useWallet } from "../../../../shared/data/walletStore";
import { Card } from "./Controls";

/* Everything here comes from the server: the saved bank or UPI details, the
   balances, and the rules the admin set (hold days, smallest payout, automatic
   payouts). Nothing is kept in the browser. */
const where = (a) =>
  a.method === "upi"
    ? { label: "UPI", main: a.upi_id || "UPI id saved" }
    : {
        label: a.bank_name || "Bank account",
        main: a.account_number || "Account saved",
      };

export default function PayoutPrefsSection({ notify }) {
  const { summary, error, reload, loading } = useWallet();
  const [editing, setEditing] = useState(false);

  if (loading) return <p className="set-note">Loading your payout details…</p>;
  if (!summary)
    return (
      <div className="set-stack">
        <Card title="Payout details">
          <p className="set-note">{error || "Could not load."}</p>
          <button type="button" className="set-btn ghost" onClick={reload}>
            Try again
          </button>
        </Card>
      </div>
    );

  const { balances: b, rules, account } = summary;
  const w = account ? where(account) : null;

  return (
    <div className="set-stack">
      <Card
        title="Where your money goes"
        note="Payouts are sent to this account by ReOrbit."
      >
        <div className="set-bank">
          {account ? (
            <div>
              <small>{w.label}</small>
              <strong>{w.main}</strong>
              <span>{account.holder_name}</span>
            </div>
          ) : (
            <div>
              <strong>No account added yet</strong>
              <span>Add a bank account or UPI id to be able to withdraw.</span>
            </div>
          )}
          <button
            type="button"
            className="set-btn ghost"
            onClick={() => setEditing(true)}
          >
            {account ? "Change account" : "Add account"}
          </button>
        </div>

        <dl className="set-facts">
          <div>
            <dt>Available to withdraw</dt>
            <dd>{inr(b.available)}</dd>
          </div>
          <div>
            <dt>Still clearing</dt>
            <dd>{inr(b.pending)}</dd>
          </div>
        </dl>
      </Card>

      <Card
        title="Payout rules"
        note="These are set by ReOrbit and apply to every seller."
      >
        <dl className="set-facts">
          <div>
            <dt>Money clears after</dt>
            <dd>{rules.payout_hold_days} days</dd>
          </div>
          <div>
            <dt>Smallest payout</dt>
            <dd>{inr(rules.payout_min_amount)}</dd>
          </div>
          <div>
            <dt>Automatic payouts</dt>
            <dd>{rules.payout_auto ? "On" : "Off"}</dd>
          </div>
        </dl>
        <p className="set-note">
          {rules.payout_auto
            ? "Anything that has cleared is paid out for you. You can also withdraw by hand."
            : "Withdraw from the Payouts page whenever you have cleared money."}
        </p>
      </Card>

      <Card title="Good to know">
        <ul className="set-list">
          <li>
            You keep the full item price. The buyer pays the platform fee and
            delivery on top.
          </li>
          <li>
            Money clears {rules.payout_hold_days} days after delivery, to give
            buyers time to report a problem.
          </li>
          <li>
            Your full account number is stored encrypted and only the last
            digits are shown here.
          </li>
        </ul>
        <Link to="/remaker-earnings" className="set-link">
          See your earnings →
        </Link>
      </Card>

      {editing && (
        <AccountModal
          account={account}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reload();
            notify?.("Payout account saved.");
          }}
        />
      )}
    </div>
  );
}
