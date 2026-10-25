import React, { useState } from "react";
import { Link } from "react-router-dom";

import { formatPrice } from "../../../data/remakerMarketplaceData";
import { useEarnings, useSales } from "../../../data/salesStore";
import { Card } from "./Controls";
import ConfirmModal from "./ConfirmModal";

/* Closing an account never happens in one click. Open orders and unpaid
   earnings are shown first, and deleting needs a typed confirmation. */
export default function DangerSection({ notify }) {
  const sales = useSales();
  const earnings = useEarnings();

  const [modal, setModal] = useState(null); /* "deactivate" | "delete" */
  const [typed, setTyped] = useState("");

  const openOrders = sales.filter((order) => order.status === "Pending" || order.status === "Confirmed").length;
  const money = earnings.available + earnings.clearing + earnings.inProgress;
  const blocked = openOrders > 0 || money > 0;

  const close = () => {
    setModal(null);
    setTyped("");
  };

  return (
    <div className="set-stack">
      <Card title="Before you go" note="Closing your studio affects your customers and your money, so we check a few things first.">
        <ul className="set-checks">
          <li className={openOrders > 0 ? "warn" : "ok"}>
            <strong>{openOrders > 0 ? `${openOrders} open ${openOrders === 1 ? "order" : "orders"}` : "No open orders"}</strong>
            <small>
              {openOrders > 0
                ? "Finish or cancel them first so no customer is left waiting."
                : "Nothing is waiting on you."}
            </small>
            {openOrders > 0 && <Link to="/remaker-sales">Go to sales</Link>}
          </li>

          <li className={money > 0 ? "warn" : "ok"}>
            <strong>{money > 0 ? `${formatPrice(money)} not yet paid out` : "No money waiting"}</strong>
            <small>
              {money > 0
                ? "Withdraw your earnings before closing so nothing is lost."
                : "You have no earnings left to withdraw."}
            </small>
            {money > 0 && <Link to="/remaker-earnings/payouts">Go to payouts</Link>}
          </li>
        </ul>
      </Card>

      <Card title="Deactivate my studio" note="A break, not a goodbye. Your studio is hidden and you can come back any time.">
        <ul className="set-list">
          <li>Your products and portfolio are hidden from the marketplace.</li>
          <li>Your reviews, followers and order history are kept.</li>
          <li>Sign in again to turn everything back on.</li>
        </ul>
        <button type="button" className="set-btn ghost" onClick={() => setModal("deactivate")}>
          Deactivate studio
        </button>
      </Card>

      <Card title="Delete my account" tone="danger" note="This cannot be undone.">
        <ul className="set-list">
          <li>Your studio, products, portfolio and followers are removed.</li>
          <li>Your reviews from customers are deleted with the products.</li>
          <li>We keep invoices and tax records for as long as the law requires.</li>
        </ul>
        <button type="button" className="set-btn danger" disabled={blocked} onClick={() => setModal("delete")}>
          Delete my account
        </button>
        {blocked && <p className="set-note">Finish your open orders and withdraw your money to unlock this.</p>}
      </Card>

      {modal === "deactivate" && (
        <ConfirmModal
          title="Deactivate your studio?"
          confirmLabel="Deactivate"
          onConfirm={() => {
            close();
            notify("We got your request. We will email you to confirm deactivation.");
          }}
          onClose={close}
        >
          <p>Your studio will be hidden until you sign in again. Customers cannot place new orders in the meantime.</p>
        </ConfirmModal>
      )}

      {modal === "delete" && (
        <ConfirmModal
          title="Delete your account for good?"
          confirmLabel="Delete my account"
          tone="danger"
          disabled={typed.trim() !== "DELETE"}
          onConfirm={() => {
            close();
            notify("We got your request. We will email you to finish deleting your account.");
          }}
          onClose={close}
        >
          <p>This removes your studio, products and portfolio. Type <b>DELETE</b> to confirm.</p>
          <input
            type="text"
            className="set-confirm-input"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="Type DELETE"
            aria-label="Type DELETE to confirm"
            autoComplete="off"
          />
        </ConfirmModal>
      )}
    </div>
  );
}
