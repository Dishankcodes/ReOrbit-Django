import React from "react";
import { Link } from "react-router-dom";

import { formatPrice } from "../../../data/remakerMarketplaceData";
import { CLEARING_DAYS, MIN_PAYOUT, useBank, useEarnings } from "../../../data/salesStore";
import { saveSection } from "../../../data/settingsStore";
import { Card, Row, SaveBar, Segmented, Toggle, useDraft } from "./Controls";

export default function PayoutPrefsSection({ settings, onDirty, notify }) {
  const { draft, set, dirty, reset } = useDraft(settings.payouts, "payouts", onDirty);
  const bank = useBank();
  const earnings = useEarnings();

  const save = () => {
    saveSection("payouts", draft);
    notify("Payout settings saved.");
  };

  return (
    <div className="set-stack">
      <Card title="Where your money goes" note="Payouts are sent to this bank account.">
        <div className="set-bank">
          <div>
            <small>{bank.bank}</small>
            <strong>•••• •••• {bank.last4}</strong>
            <span>{bank.holder}</span>
          </div>
          <Link to="/remaker-earnings/payouts" className="set-btn ghost">
            Change bank account
          </Link>
        </div>

        <dl className="set-facts">
          <div>
            <dt>Available to withdraw</dt>
            <dd>{formatPrice(earnings.available)}</dd>
          </div>
          <div>
            <dt>Still clearing</dt>
            <dd>{formatPrice(earnings.clearing)}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Automatic payouts" note={`We can send what has cleared to your bank for you, once it reaches ${formatPrice(MIN_PAYOUT)}.`}>
        <Row title="Pay me automatically" note="You can still withdraw by hand whenever you like.">
          <Toggle checked={draft.auto} onChange={(value) => set("auto", value)} label="Automatic payouts" />
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
              If less than {formatPrice(MIN_PAYOUT)} has cleared on the day, we wait for the next one.
            </p>
          </div>
        )}
      </Card>

      <Card title="Good to know">
        <ul className="set-list">
          <li>ReOrbit keeps 8% of the item price. The buyer pays delivery separately.</li>
          <li>Money clears {CLEARING_DAYS} days after delivery, to give buyers time to report a problem.</li>
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
