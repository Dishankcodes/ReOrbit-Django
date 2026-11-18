import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiRequest } from "../../../../api/api";
import { signOut } from "../../../../api/auth";

import { salesApi } from "../../../../api/orders";
import { inr as formatPrice } from "../../../../shared/components/WalletParts";
import { useWallet } from "../../../../shared/data/walletStore";
import { Card } from "./Controls";
import ConfirmModal from "./ConfirmModal";

/* Closing an account never happens in one click. Open orders and unpaid earnings are shown first,
   deleting needs a typed confirmation, and the account can be brought back by signing in within 30 days. */
export default function DangerSection({ notify }) {
  const navigate = useNavigate();
  const { summary } = useWallet();
  const [counts, setCounts] = useState(null);
  const [server, setServer] = useState(null); /* { blockers, grace_days } from the server */
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    apiRequest("/remakers/me/delete/")
      .then((r) => setServer(r.data))
      .catch(() => setServer({ blockers: [], grace_days: 30 }));
  }, []);

  useEffect(() => {
    let alive = true;
    salesApi
      .list("?page_size=1")
      .then((d) => alive && setCounts(d.counts || {}))
      .catch(() => alive && setCounts({}));
    return () => {
      alive = false;
    };
  }, []);

  const [modal, setModal] = useState(null); /* "deactivate" | "delete" */
  const [typed, setTyped] = useState("");

  const c = counts || {};
  const openOrders = (c.Confirmed || 0) + (c.Packed || 0) + (c.Shipped || 0);
  const b = summary?.balances;
  const money = b ? b.available + b.pending + b.in_review : 0;
  const serverBlockers = server?.blockers || [];
  const blocked = openOrders > 0 || money > 0 || serverBlockers.length > 0;
  const days = server?.grace_days || 30;

  const remove = async () => {
    setBusy(true);
    try {
      const r = await apiRequest("/remakers/me/delete/", { method: "POST", body: { confirm: typed } });
      signOut();
      navigate("/remakers-home", { replace: true, state: { notice: r.message } });
    } catch (ex) {
      if (ex.errors?.blockers) setServer((x) => ({ ...x, blockers: ex.errors.blockers }));
      notify(ex.message || "Your account wasn't deleted.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setModal(null);
    setTyped("");
  };

  return (
    <div className="set-stack">
      <Card
        title="Before you go"
        note="Closing your studio affects your customers and your money, so we check a few things first."
      >
        <ul className="set-checks">
          <li className={openOrders > 0 ? "warn" : "ok"}>
            <strong>
              {openOrders > 0
                ? `${openOrders} open ${openOrders === 1 ? "order" : "orders"}`
                : "No open orders"}
            </strong>
            <small>
              {openOrders > 0
                ? "Finish or cancel them first so no customer is left waiting."
                : "Nothing is waiting on you."}
            </small>
            {openOrders > 0 && <Link to="/remaker-sales">Go to sales</Link>}
          </li>

          <li className={money > 0 ? "warn" : "ok"}>
            <strong>
              {money > 0
                ? `${formatPrice(money)} not yet paid out`
                : "No money waiting"}
            </strong>
            <small>
              {money > 0
                ? "Withdraw your earnings before closing so nothing is lost."
                : "You have no earnings left to withdraw."}
            </small>
            {money > 0 && (
              <Link to="/remaker-earnings/payouts">Go to payouts</Link>
            )}
          </li>
        </ul>
      </Card>

      <Card
        title="Delete my account"
        tone="danger"
        note={`Your studio is hidden straight away and deleted for good after ${days} days.`}
      >
        <ul className="set-list">
          <li>Changed your mind? Sign in within {days} days and everything comes back.</li>
          <li>Your studio, products and portfolio leave the marketplace at once.</li>
          <li>
            After {days} days your name, contact details, photos and followers are removed. Orders and payouts stay
            on record without your personal details.
          </li>
        </ul>
        {serverBlockers.length > 0 && (
          <ul className="set-list set-blockers">
            {serverBlockers.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="set-btn danger"
          disabled={blocked}
          onClick={() => setModal("delete")}
        >
          Delete my account
        </button>
        {blocked && (
          <p className="set-note">
            Finish your open orders and withdraw your money to unlock this.
          </p>
        )}
      </Card>

      {modal === "delete" && (
        <ConfirmModal
          title="Delete your account?"
          confirmLabel={busy ? "Deleting…" : "Delete my account"}
          tone="danger"
          disabled={busy || typed.trim().toUpperCase() !== "DELETE"}
          onConfirm={remove}
          onClose={close}
        >
          <p>
            Your studio is hidden now and deleted for good in {days} days. Sign in before then to keep it. Type{" "}
            <b>DELETE</b> to confirm.
          </p>
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
