import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import EarningsNav from "./EarningsNav";
import { ActionModal } from "../Sales/SalesParts";
import { formatPrice } from "../../data/remakerMarketplaceData";
import { formatDate, formatDateTime } from "../../data/ordersStore";
import {
  CLEARING_DAYS,
  MIN_PAYOUT,
  requestPayout,
  updateBank,
  useBank,
  useEarnings,
  usePayouts,
  useSales,
} from "../../data/salesStore";

import "../../css/ReMakerOrders.css";
import "../../css/ReMakerSales.css";

function BankModal({ bank, onSave, onClose }) {
  const [holder, setHolder] = useState(bank.holder);
  const [name, setName] = useState(bank.bank);
  const [account, setAccount] = useState("");
  const [ifsc, setIfsc] = useState(bank.ifsc);
  const [attempted, setAttempted] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  const errors = {
    holder: holder.trim().length >= 3 ? "" : "Enter the name on the account.",
    name: name.trim().length >= 2 ? "" : "Enter your bank's name.",
    account: /^[0-9]{9,18}$/.test(account.trim()) ? "" : "Account numbers have 9 to 18 digits.",
    ifsc: /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifsc.trim()) ? "" : "IFSC looks like SBIN0001234.",
  };

  const show = (key) => (attempted ? errors[key] : "");

  const submit = () => {
    setAttempted(true);
    if (Object.values(errors).some(Boolean)) return;

    onSave({ holder, bank: name, accountNumber: account.trim(), ifsc });
  };

  return (
    <div
      className="rod-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="rod-modal sls-bank-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sls-bank-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        <h2 id="sls-bank-title">Bank account for payouts</h2>
        <p>
          Money is sent to this account. For your safety we keep only the last 4 digits of the account number.
        </p>

        <div className="rod-fields sls-bank-fields">
          <div className="rod-field">
            <label htmlFor="sls-holder">Name on the account</label>
            <input id="sls-holder" type="text" value={holder} onChange={(e) => setHolder(e.target.value)} aria-invalid={show("holder") ? "true" : undefined} />
            {show("holder") && <span className="rod-error">{show("holder")}</span>}
          </div>

          <div className="rod-field">
            <label htmlFor="sls-bankname">Bank</label>
            <input id="sls-bankname" type="text" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={show("name") ? "true" : undefined} />
            {show("name") && <span className="rod-error">{show("name")}</span>}
          </div>

          <div className="rod-field">
            <label htmlFor="sls-account">Account number</label>
            <input
              id="sls-account"
              type="text"
              inputMode="numeric"
              maxLength={18}
              value={account}
              placeholder={`Currently ending ${bank.last4}`}
              onChange={(e) => setAccount(e.target.value.replace(/\D/g, ""))}
              aria-invalid={show("account") ? "true" : undefined}
            />
            {show("account") && <span className="rod-error">{show("account")}</span>}
          </div>

          <div className="rod-field">
            <label htmlFor="sls-ifsc">IFSC code</label>
            <input
              id="sls-ifsc"
              type="text"
              maxLength={11}
              value={ifsc}
              onChange={(e) => setIfsc(e.target.value.toUpperCase())}
              aria-invalid={show("ifsc") ? "true" : undefined}
            />
            {show("ifsc") && <span className="rod-error">{show("ifsc")}</span>}
          </div>
        </div>

        <div className="rod-modal-actions">
          <button type="button" className="rod-btn primary" onClick={submit}>
            Save bank account
          </button>
          <button type="button" className="rod-btn ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReMakerPayouts() {
  const orders = useSales();
  const payouts = usePayouts();
  const earnings = useEarnings();
  const bank = useBank();

  const [modal, setModal] = useState(null); /* "withdraw" | "bank" */
  const [open, setOpen] = useState("");
  const [notice, setNotice] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    if (!notice) return undefined;

    timer.current = setTimeout(() => setNotice(""), 3600);
    return () => clearTimeout(timer.current);
  }, [notice]);

  const canWithdraw = earnings.available >= MIN_PAYOUT;

  const confirmWithdraw = () => {
    const payout = requestPayout();
    setModal(null);

    if (payout) {
      setOpen(payout.id);
      setNotice(`Payout ${payout.id} requested. It reaches your bank in 1 to 2 working days.`);
    }
  };

  const saveBank = (data) => {
    updateBank(data);
    setModal(null);
    setNotice("Bank account updated.");
  };

  return (
    <section className="rod rsl">
      <EarningsNav />

      <div className="rod-grid">
        <div className="rod-main">
          {/* WITHDRAW */}
          <section className="rod-panel sls-withdraw">
            <div>
              <small>Available to withdraw</small>
              <strong>{formatPrice(earnings.available)}</strong>
              <p>
                {canWithdraw
                  ? `From ${earnings.availableOrders.length} completed ${earnings.availableOrders.length === 1 ? "order" : "orders"}.`
                  : earnings.available > 0
                    ? `The minimum payout is ${formatPrice(MIN_PAYOUT)}.`
                    : `Earnings clear ${CLEARING_DAYS} days after delivery.`}
              </p>
            </div>

            <button type="button" className="rod-btn primary" disabled={!canWithdraw} onClick={() => setModal("withdraw")}>
              Withdraw {canWithdraw ? formatPrice(earnings.available) : ""}
            </button>
          </section>

          {/* HISTORY */}
          <section className="rod-panel">
            <h3>Payout history</h3>

            {payouts.length === 0 ? (
              <div className="rod-empty small">
                <h2>No payouts yet</h2>
                <p>Your first payout appears here after you withdraw.</p>
              </div>
            ) : (
              <div className="sls-payouts">
                {payouts.map((payout) => {
                  const included = orders.filter((order) => payout.orderIds.includes(order.id));
                  const expanded = open === payout.id;

                  return (
                    <article className={`sls-payout ${expanded ? "open" : ""}`} key={payout.id}>
                      <button
                        type="button"
                        className="sls-payout-head"
                        aria-expanded={expanded}
                        onClick={() => setOpen(expanded ? "" : payout.id)}
                      >
                        <span className="sls-payout-id">
                          <strong>{payout.id}</strong>
                          <small>{formatDate(payout.createdAt)}</small>
                        </span>
                        <span className="sls-payout-meta">
                          {payout.orderIds.length} {payout.orderIds.length === 1 ? "order" : "orders"} · to ••••{payout.bankLast4}
                        </span>
                        <span className="sls-payout-amount">{formatPrice(payout.amount)}</span>
                        <span className={`sls-earn ${payout.status === "Paid" ? "done" : "active"}`}>
                          {payout.status === "Paid" ? "Paid" : "Processing"}
                        </span>
                      </button>

                      {expanded && (
                        <div className="sls-payout-body">
                          <dl className="rod-facts compact">
                            <div>
                              <dt>Requested</dt>
                              <dd>{formatDateTime(payout.createdAt)}</dd>
                            </div>
                            <div>
                              <dt>Reference</dt>
                              <dd>{payout.reference}</dd>
                            </div>
                          </dl>

                          <ul className="sls-payout-orders">
                            {included.map((order) => (
                              <li key={order.id}>
                                <Link to={`/remaker-sales/${order.id}`}>
                                  <img src={order.image} alt="" />
                                  <span>
                                    <strong>{order.title}</strong>
                                    <small>{order.id}</small>
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="rod-side">
          <section className="rod-panel sls-bank">
            <div className="rod-panel-head">
              <h3>Bank account</h3>
              <button type="button" className="sls-textbtn" onClick={() => setModal("bank")}>
                Change
              </button>
            </div>

            <div className="sls-bank-card">
              <small>{bank.bank}</small>
              <strong>•••• •••• {bank.last4}</strong>
              <span>{bank.holder}</span>
              <em>IFSC {bank.ifsc}</em>
            </div>
          </section>

          <section className="rod-panel">
            <h3>Payout rules</h3>

            <ol className="rod-next">
              <li>
                <strong>Earnings clear after {CLEARING_DAYS} days</strong>
                <small>This gives the customer time to report a problem.</small>
              </li>
              <li>
                <strong>Withdraw {formatPrice(MIN_PAYOUT)} or more</strong>
                <small>You can withdraw everything that has cleared in one go.</small>
              </li>
              <li>
                <strong>Money arrives in 1 to 2 working days</strong>
                <small>We pay the bank account shown above.</small>
              </li>
            </ol>
          </section>
        </aside>
      </div>

      {modal === "withdraw" && (
        <ActionModal
          title={`Withdraw ${formatPrice(earnings.available)}?`}
          text={`We will send it to ${bank.bank} ending ${bank.last4}. It reaches your bank in 1 to 2 working days.`}
          confirmLabel="Withdraw now"
          cancelLabel="Not now"
          onConfirm={confirmWithdraw}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "bank" && <BankModal bank={bank} onSave={saveBank} onClose={() => setModal(null)} />}

      {notice && (
        <div className="rod-toast" role="status" aria-live="polite">
          {notice}
        </div>
      )}
    </section>
  );
}
