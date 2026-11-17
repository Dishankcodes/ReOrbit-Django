import React from "react";
import { Link } from "react-router-dom";

import { formatPrice } from "../../../data/remakerMarketplaceData";
import { useWallet } from "../../../../shared/data/walletStore";
import { saveSection } from "../../../data/settingsStore";
import { Card, Row, SaveBar, Segmented, Toggle, useDraft } from "./Controls";

export default function PayoutPrefsSection({ settings, onDirty, notify }) {
  const { draft, set, dirty, reset } = useDraft(
    settings.payouts,
    "payouts",
    onDirty,
  );
  const { summary } = useWallet();
  const bank = summary?.account || null;
  const balances = summary?.balances || {
    available: 0,
    pending: 0,
    in_review: 0,
  };
  const CLEARING_DAYS = summary?.rules?.payout_hold_days ?? 7;
  const MIN_PAYOUT = summary?.rules?.payout_min_amount ?? 0;

  const save = () => {
    saveSection("payouts", draft);
    notify("Payout settings saved.");
  };

  return (
    <div className="set-stack">
      <Card
        title="Where your money goes"
        note="Payouts are sent to this bank account."
      >
        <div className="set-bank">
          {bank ? (
            <div>
              <small>
                {bank.method === "UPI" ? "UPI" : bank.bank_name || "Bank account"}
              </small>
              <strong>
                {bank.method === "UPI" ? bank.upi_id : bank.account_number}
              </strong>
              <span>{bank.holder_name}</span>
            </div>
          ) : (
            <div>
              <small>No payout details yet</small>
              <strong>Add where we should send your money</strong>
            </div>
          )}
          <Link to="/remaker-earnings/payouts" className="set-btn ghost">
            {bank ? "Change bank account" : "Add bank account"}
          </Link>
        </div>

        <dl className="set-facts">
          <div>
            <dt>Available to withdraw</dt>
            <dd>{formatPrice(balances.available)}</dd>
          </div>
          <div>
            <dt>Still clearing</dt>
            <dd>{formatPrice(balances.pending + balances.in_review)}</dd>
          </div>
        </dl>
      </Card>

      <Card
        title="Automatic payouts"
        note={`We can send what has cleared to your bank for you, once it reaches ${formatPrice(MIN_PAYOUT)}.`}
      >
        <Row
          title="Pay me automatically"
          note="You can still withdraw by hand whenever you like."
        >
          <Toggle
            checked={draft.auto}
            onChange={(value) => set("auto", value)}
            label="Automatic payouts"
          />
        </Row>

        {draft.auto && (
          <div className="set-reveal">
            <span className="set-label">How often</span>
            <Segmented
              label="Payout schedule"
              value={draft.schedule}
              onChange={(value) => set("schedule", value)}
              options={[
                { value: "weekly", label: "Every Monday" },
                { value: "biweekly", label: "Every 2 weeks" },
                { value: "monthly", label: "1st of the month" },
              ]}
            />
            <p className="set-note">
              If less than {formatPrice(MIN_PAYOUT)} has cleared on the day, we
              wait for the next one.
            </p>
          </div>
        )}
      </Card>

      <Card title="Good to know">
        <ul className="set-list">
          <li>
            You keep the full item price. The buyer pays the platform fee and
            delivery on top.
          </li>
          <li>
            Money clears {CLEARING_DAYS} days after delivery, to give buyers
            time to report a problem.
          </li>
          <li>Payouts reach your bank in 1 to 2 working days.</li>
        </ul>
        <Link to="/remaker-earnings" className="set-link">
          See your earnings →
        </Link>
      </Card>

      <SaveBar dirty={dirty} onSave={save} onReset={reset} />
    </div>
  );
}
