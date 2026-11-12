import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { walletApi } from "../../api/payouts";
import { usePagedList } from "../data/walletStore";
import { ActionModal } from "../../remaker/pages/Sales/SalesParts";
import Spinner, { PageLoader } from "./Spinner";

import "../../remaker/css/ReMakerOrders.css";
import "../../remaker/css/ReMakerSales.css";
import "./WalletParts.css";

export const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
const first = (v) => (Array.isArray(v) ? v[0] : v) || "";

/* ---------------------------------------------------------------- balance */
export function BalanceHero({ summary, payoutsTo, transactionsTo }) {
  const { balances: b, rules, account } = summary;
  const canWithdraw = b.available >= rules.payout_min_amount && !!account;
  return (
    <div className="sls-balance">
      <div className="sls-balance-main">
        <small>Available to withdraw</small>
        <strong>{inr(b.available)}</strong>
        <p>
          {!account && b.available > 0
            ? "Add your bank or UPI details to withdraw."
            : canWithdraw
              ? "Ready to send to your account."
              : b.available > 0
                ? `You can withdraw once you have ${inr(rules.payout_min_amount)} available.`
                : `Nothing to withdraw yet. Earnings clear ${rules.payout_hold_days} days after delivery.`}
        </p>
        <div className="sls-balance-actions">
          <Link
            to={payoutsTo}
            className={`rod-btn ${canWithdraw ? "light" : "light-off"}`}
          >
            {canWithdraw ? "Withdraw money" : "View payouts"}
          </Link>
          {transactionsTo && (
            <Link to={transactionsTo} className="rod-btn outline-light">
              See transactions
            </Link>
          )}
        </div>
      </div>
      <dl className="sls-balance-side">
        <div>
          <dt>Clearing</dt>
          <dd>{inr(b.pending)}</dd>
          <small>Clears {rules.payout_hold_days} days after delivery</small>
        </div>
        <div>
          <dt>Payout in progress</dt>
          <dd>{inr(b.in_review)}</dd>
          <small>Waiting for ReOrbit to pay</small>
        </div>
        <div>
          <dt>Paid out so far</dt>
          <dd>{inr(b.paid_out)}</dd>
          <small>{inr(b.lifetime)} earned in total</small>
        </div>
      </dl>
    </div>
  );
}

/* ---------------------------------------------------------------- ledger */
const KIND = {
  Earning: "Sale earning",
  Payout: "Payout requested",
  Release: "Payout returned",
};

export function LedgerList({ kind = "" }) {
  const list = usePagedList(walletApi.entries, kind ? `kind=${kind}` : "");
  if (list.state === "loading")
    return <PageLoader label="Loading transactions…" minHeight={160} />;
  if (list.state === "error")
    return (
      <p className="wlt-error" role="alert">
        {list.error}
      </p>
    );
  if (!list.rows.length)
    return (
      <div className="rod-empty small">
        <h2>No transactions yet</h2>
        <p>Your earnings appear here once an order is delivered.</p>
      </div>
    );
  const now = Date.now();
  return (
    <>
      <ul className="wlt-ledger">
        {list.rows.map((e) => {
          const clearing =
            e.kind === "Earning" && new Date(e.available_at).getTime() > now;
          return (
            <li key={e.id}>
              <span className="wlt-l-main">
                <strong>{e.note || KIND[e.kind]}</strong>
                <small>
                  {KIND[e.kind]} · {fmtDate(e.created_at)}
                  {clearing ? ` · clears ${fmtDate(e.available_at)}` : ""}
                </small>
              </span>
              <span className={`wlt-amt ${e.amount < 0 ? "out" : "in"}`}>
                {e.amount < 0 ? "−" : "+"}
                {inr(Math.abs(e.amount))}
              </span>
              <span className={`sls-earn ${clearing ? "active" : "done"}`}>
                {clearing ? "Clearing" : "Available"}
              </span>
            </li>
          );
        })}
      </ul>
      {list.more && (
        <button
          type="button"
          className="rod-btn ghost wlt-more"
          onClick={list.loadMore}
        >
          Load more
        </button>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- account */
function AccountModal({ account, onSaved, onClose }) {
  const [method, setMethod] = useState(account?.method || "bank");
  const [f, setF] = useState({
    holder_name: account?.holder_name || "",
    bank_name: account?.bank_name || "",
    account_number: "",
    account_number_confirm: "",
    ifsc: account?.ifsc || "",
    upi_id: "",
  });
  const [errors, setErrors] = useState({});
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }));

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, busy]);

  const submit = async () => {
    if (busy) return;
    const e = {};
    if (f.holder_name.trim().length < 2)
      e.holder_name = "Enter the name on the account.";
    if (method === "bank") {
      if (!/^\d{9,18}$/.test(f.account_number))
        e.account_number = "Account numbers have 9 to 18 digits.";
      if (f.account_number_confirm !== f.account_number)
        e.account_number_confirm = "The two numbers don't match.";
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(f.ifsc))
        e.ifsc = "IFSC looks like SBIN0001234.";
    } else if (
      !/^[A-Za-z0-9._-]{2,64}@[A-Za-z][A-Za-z0-9]{1,30}$/.test(f.upi_id.trim())
    ) {
      e.upi_id = "UPI ids look like name@bank.";
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setProblem("");
    try {
      const body =
        method === "bank"
          ? {
              method,
              holder_name: f.holder_name,
              bank_name: f.bank_name,
              account_number: f.account_number,
              account_number_confirm: f.account_number_confirm,
              ifsc: f.ifsc,
            }
          : { method, holder_name: f.holder_name, upi_id: f.upi_id };
      onSaved(await walletApi.saveAccount(body));
    } catch (err) {
      const fe = {};
      Object.entries(err.errors || {}).forEach(([k, v]) => {
        fe[k] = first(v);
      });
      setErrors(fe);
      setProblem(
        Object.keys(fe).length ? "" : err.message || "Could not save.",
      );
      setBusy(false);
    }
  };

  const field = (id, label, props = {}) => (
    <div className="rod-field">
      <label htmlFor={`w-${id}`}>{label}</label>
      <input
        id={`w-${id}`}
        value={f[id]}
        onChange={(e) =>
          set(
            id,
            props.upper
              ? e.target.value.toUpperCase()
              : props.digits
                ? e.target.value.replace(/\D/g, "")
                : e.target.value,
          )
        }
        aria-invalid={errors[id] ? "true" : undefined}
        disabled={busy}
        {...props.attrs}
      />
      {errors[id] && <span className="rod-error">{errors[id]}</span>}
    </div>
  );

  return (
    <div
      className="rod-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        className="rod-modal sls-bank-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="w-title"
        tabIndex={-1}
        ref={ref}
      >
        <h2 id="w-title">Where should we pay you?</h2>
        <p>
          Your earnings are sent here. We only show the last digits after you
          save.
        </p>
        <div
          className="wlt-method"
          role="radiogroup"
          aria-label="Payout method"
        >
          {[
            ["bank", "Bank account"],
            ["upi", "UPI"],
          ].map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={method === k}
              className={method === k ? "on" : ""}
              onClick={() => {
                setMethod(k);
                setErrors({});
              }}
              disabled={busy}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="rod-fields sls-bank-fields">
          {field("holder_name", "Name on the account")}
          {method === "bank" ? (
            <>
              {field("bank_name", "Bank (optional)")}
              {field("account_number", "Account number", {
                digits: true,
                attrs: {
                  inputMode: "numeric",
                  maxLength: 18,
                  placeholder: account?.account_number
                    ? `Currently ${account.account_number}`
                    : "",
                },
              })}
              {field("account_number_confirm", "Confirm account number", {
                digits: true,
                attrs: { inputMode: "numeric", maxLength: 18 },
              })}
              {field("ifsc", "IFSC code", {
                upper: true,
                attrs: { maxLength: 11 },
              })}
            </>
          ) : (
            field("upi_id", "UPI id", {
              attrs: {
                placeholder: account?.upi_id || "name@bank",
                autoCapitalize: "none",
              },
            })
          )}
        </div>
        {problem && (
          <p className="wlt-error" role="alert">
            {problem}
          </p>
        )}
        <div className="rod-modal-actions">
          <button
            type="button"
            className="rod-btn primary"
            onClick={submit}
            disabled={busy}
          >
            {busy ? <Spinner label="Saving…" /> : "Save payout details"}
          </button>
          <button
            type="button"
            className="rod-btn ghost"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const destination = (a) =>
  a?.method === "upi"
    ? `UPI ${a.upi_id}`
    : a
      ? `${a.bank_name || "bank"} ${a.account_number}`
      : "";

/* ---------------------------------------------------------------- payouts */
export function PayoutsPanel({ summary, reload }) {
  const { balances: b, rules, account, last_payout: last } = summary;
  const list = usePagedList(walletApi.payouts);
  const [modal, setModal] = useState(null); // withdraw | account
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const open = last && last.status === "Pending";
  const canWithdraw =
    !!account && !open && b.available >= rules.payout_min_amount;

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const withdraw = async () => {
    if (busy) return;
    setBusy(true);
    setProblem("");
    try {
      const r = await walletApi.request();
      setModal(null);
      setNotice(
        `Payout ${r.payout.id} requested. ReOrbit will send it to your account.`,
      );
      await Promise.all([reload(), list.reload()]);
    } catch (e) {
      setModal(null);
      setProblem(e.message || "Could not request the payout.");
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="rod-grid">
        <div className="rod-main">
          <section className="rod-panel sls-withdraw">
            <div>
              <small>Available to withdraw</small>
              <strong>{inr(b.available)}</strong>
              <p>
                {open
                  ? `A payout of ${inr(last.amount)} is waiting to be paid.`
                  : !account
                    ? "Add your bank or UPI details first."
                    : canWithdraw
                      ? "Everything that has cleared goes in one payout."
                      : b.available > 0
                        ? `The minimum payout is ${inr(rules.payout_min_amount)}.`
                        : `Earnings clear ${rules.payout_hold_days} days after delivery.`}
              </p>
            </div>
            {account ? (
              <button
                type="button"
                className="rod-btn primary"
                disabled={!canWithdraw || busy}
                onClick={() => setModal("withdraw")}
              >
                Withdraw {canWithdraw ? inr(b.available) : ""}
              </button>
            ) : (
              <button
                type="button"
                className="rod-btn primary"
                onClick={() => setModal("account")}
              >
                Add payout details
              </button>
            )}
          </section>
          {problem && (
            <p className="wlt-error" role="alert">
              {problem}
            </p>
          )}

          <section className="rod-panel">
            <h3>Payout history</h3>
            {list.state === "loading" ? (
              <PageLoader label="Loading payouts…" minHeight={120} />
            ) : list.state === "error" ? (
              <p className="wlt-error" role="alert">
                {list.error}
              </p>
            ) : list.rows.length === 0 ? (
              <div className="rod-empty small">
                <h2>No payouts yet</h2>
                <p>Your first payout appears here after you withdraw.</p>
              </div>
            ) : (
              <>
                <div className="sls-payouts">
                  {list.rows.map((p) => (
                    <article className="sls-payout open" key={p.id}>
                      <div className="sls-payout-head wlt-static">
                        <span className="sls-payout-id">
                          <strong>{p.id}</strong>
                          <small>
                            {fmtDate(p.created_at)}
                            {p.source === "auto" ? " · automatic" : ""}
                          </small>
                        </span>
                        <span className="sls-payout-meta">
                          to {destination(p.account)}
                        </span>
                        <span className="sls-payout-amount">
                          {inr(p.amount)}
                        </span>
                        <span
                          className={`sls-earn ${p.status === "Paid" ? "done" : p.status === "Rejected" ? "bad" : "active"}`}
                        >
                          {p.status === "Pending" ? "Processing" : p.status}
                        </span>
                      </div>
                      {(p.reference || p.reject_reason) && (
                        <div className="sls-payout-body">
                          <dl className="rod-facts compact">
                            {p.reference && (
                              <div>
                                <dt>Reference</dt>
                                <dd>{p.reference}</dd>
                              </div>
                            )}
                            {p.paid_at && (
                              <div>
                                <dt>Paid on</dt>
                                <dd>{fmtDate(p.paid_at)}</dd>
                              </div>
                            )}
                            {p.reject_reason && (
                              <div>
                                <dt>Why it wasn't sent</dt>
                                <dd>
                                  {p.reject_reason}. The money is back in your
                                  wallet.
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
                {list.more && (
                  <button
                    type="button"
                    className="rod-btn ghost wlt-more"
                    onClick={list.loadMore}
                  >
                    Load more
                  </button>
                )}
              </>
            )}
          </section>
        </div>

        <aside className="rod-side">
          <section className="rod-panel sls-bank">
            <div className="rod-panel-head">
              <h3>Payout details</h3>
              <button
                type="button"
                className="sls-textbtn"
                onClick={() => setModal("account")}
              >
                {account ? "Change" : "Add"}
              </button>
            </div>
            {account ? (
              <div className="sls-bank-card">
                <small>
                  {account.method === "upi"
                    ? "UPI"
                    : account.bank_name || "Bank account"}
                </small>
                <strong>
                  {account.method === "upi"
                    ? account.upi_id
                    : account.account_number}
                </strong>
                <span>{account.holder_name}</span>
                {account.method === "bank" && <em>IFSC {account.ifsc}</em>}
              </div>
            ) : (
              <p className="wlt-hint">No payout details yet.</p>
            )}
          </section>

          <section className="rod-panel">
            <h3>How payouts work</h3>
            <ol className="rod-next">
              <li>
                <strong>
                  Earnings clear {rules.payout_hold_days} days after delivery
                </strong>
                <small>This gives the buyer time to report a problem.</small>
              </li>
              <li>
                <strong>Withdraw {inr(rules.payout_min_amount)} or more</strong>
                <small>
                  You get the item price in full. The platform fee and delivery
                  are paid by the buyer.
                </small>
              </li>
              <li>
                <strong>
                  {rules.payout_auto
                    ? "Payouts are created for you"
                    : "You request each payout"}
                </strong>
                <small>
                  ReOrbit then sends the money to the account shown here and
                  adds the transfer reference.
                </small>
              </li>
            </ol>
          </section>
        </aside>
      </div>

      {modal === "withdraw" && (
        <ActionModal
          title={`Withdraw ${inr(b.available)}?`}
          text={`We will send it to ${destination(account)}.`}
          confirmLabel={busy ? "Requesting…" : "Withdraw now"}
          cancelLabel="Not now"
          onConfirm={withdraw}
          onClose={() => !busy && setModal(null)}
        />
      )}
      {modal === "account" && (
        <AccountModal
          account={account}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            setNotice("Payout details saved.");
            reload();
          }}
        />
      )}
      {notice && (
        <div className="rod-toast" role="status" aria-live="polite">
          {notice}
        </div>
      )}
    </>
  );
}

/* Wraps a page that needs the wallet: spinner on first load, error with retry. */
export function WalletGate({ wallet, children }) {
  if (wallet.error && !wallet.summary)
    return (
      <div className="rod-empty small">
        <h2>Couldn't load your wallet</h2>
        <p>{wallet.error}</p>
        <button
          type="button"
          className="rod-btn primary"
          onClick={wallet.reload}
        >
          Try again
        </button>
      </div>
    );
  if (!wallet.summary) return <PageLoader label="Loading your wallet…" />;
  return children(wallet.summary);
}
