import React, { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";

import { adminPayoutApi } from "../../../api/payouts";
import { useAccess } from "../../data/teamStore";
import { formatDate, formatINR } from "../../utils/format";
import Pagination from "../../components/ui/Pagination";
import ErrorState from "../../components/ui/ErrorState";
import Spinner from "../../../shared/components/Spinner";
import { SkeletonRows } from "../../../shared/components/Skeleton";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/products/ProductsReal.css";
import "../../css/earnings/PayoutsLive.css";

const STATUS = { Pending: "To pay", Paid: "Paid", Rejected: "Rejected" };

const where = (a) =>
  a?.method === "upi"
    ? [
        ["UPI id", a.upi_id],
        ["Name", a.holder_name],
      ]
    : [
        ["Name", a.holder_name],
        ["Bank", a.bank_name],
        ["Account", a.account_number],
        ["IFSC", a.ifsc],
      ];

function Summary({ s }) {
  const cards = [
    [
      "Waiting to be paid",
      s.awaiting_payment,
      "Payouts created, transfer not sent",
    ],
    ["Available to sellers", s.available, "Cleared, not yet withdrawn"],
    [
      "Clearing",
      s.pending,
      `Held ${s.rules.payout_hold_days} days after delivery`,
    ],
    ["Paid out in total", s.paid_total, "Transfers marked as sent"],
  ];
  return (
    <div className="pyo-cards">
      {cards.map(([t, v, n]) => (
        <div className="pyo-card" key={t}>
          <small>{t}</small>
          <strong>{formatINR(v)}</strong>
          <span>{n}</span>
        </div>
      ))}
    </div>
  );
}

function Rules({ rules, canEdit, onSaved, toast }) {
  const [f, setF] = useState({
    days: String(rules.payout_hold_days),
    min: String(rules.payout_min_amount),
    auto: rules.payout_auto,
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState("");
  useEffect(
    () =>
      setF({
        days: String(rules.payout_hold_days),
        min: String(rules.payout_min_amount),
        auto: rules.payout_auto,
      }),
    [rules],
  );

  const save = async () => {
    setBusy("save");
    setErrors({});
    try {
      const r = await adminPayoutApi.saveRules({
        payout_hold_days: Number(f.days),
        payout_min_amount: Number(f.min),
        payout_auto: f.auto,
      });
      onSaved(r);
      toast("Payout rules saved.");
    } catch (e) {
      const fe = {};
      Object.entries(e.errors || {}).forEach(([k, v]) => {
        fe[k] = Array.isArray(v) ? v[0] : v;
      });
      setErrors(fe);
      if (!Object.keys(fe).length) toast(e.message || "Could not save.");
    }
    setBusy("");
  };

  const runNow = async () => {
    setBusy("run");
    try {
      const r = await adminPayoutApi.runAuto();
      toast(
        r.created
          ? `${r.created} payout(s) created.`
          : "No seller is ready for a payout right now.",
      );
      onSaved(null);
    } catch (e) {
      toast(e.message || "Could not run.");
    }
    setBusy("");
  };

  return (
    <section className="au-panel pyo-rules">
      <h3>Payout rules</h3>
      <div className="pyo-rules-grid">
        <label className={`apr-field ${errors.payout_hold_days ? "bad" : ""}`}>
          Hold after delivery (days)
          <input
            inputMode="numeric"
            value={f.days}
            disabled={!canEdit || !!busy}
            onChange={(e) =>
              setF({ ...f, days: e.target.value.replace(/\D/g, "") })
            }
          />
          {errors.payout_hold_days && <small>{errors.payout_hold_days}</small>}
        </label>
        <label className={`apr-field ${errors.payout_min_amount ? "bad" : ""}`}>
          Smallest payout (₹)
          <input
            inputMode="numeric"
            value={f.min}
            disabled={!canEdit || !!busy}
            onChange={(e) =>
              setF({ ...f, min: e.target.value.replace(/\D/g, "") })
            }
          />
          {errors.payout_min_amount && (
            <small>{errors.payout_min_amount}</small>
          )}
        </label>
        <label className="pyo-switch">
          <input
            type="checkbox"
            checked={f.auto}
            disabled={!canEdit || !!busy}
            onChange={(e) => setF({ ...f, auto: e.target.checked })}
          />
          <span>
            <b>Automatic payouts</b>
            <small>
              {f.auto
                ? "On: a payout is created for every seller who reaches the minimum."
                : "Off: sellers request their own payouts."}
            </small>
          </span>
        </label>
      </div>
      {canEdit && (
        <div className="pyo-rules-actions">
          <button
            type="button"
            className="ad-btn ad-btn-primary"
            onClick={save}
            disabled={!!busy}
          >
            {busy === "save" ? <Spinner label="Saving…" /> : "Save rules"}
          </button>
          {rules.payout_auto && (
            <button
              type="button"
              className="ad-btn ad-btn-ghost"
              onClick={runNow}
              disabled={!!busy}
            >
              {busy === "run" ? (
                <Spinner label="Running…" />
              ) : (
                "Create payouts now"
              )}
            </button>
          )}
          <small>
            You still send the bank or UPI transfer yourself, then mark it paid.
          </small>
        </div>
      )}
    </section>
  );
}

function PayModal({ payout, mode, canReveal, onClose, onDone }) {
  const [text, setText] = useState("");
  const [full, setFull] = useState(null);
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState("");
  const reveal = async () => {
    setRevealing(true);
    setRevealError("");
    try {
      setFull(await adminPayoutApi.details(payout.id));
    } catch (e) {
      setRevealError(
        e.status === 403
          ? "You don't have permission to view payment details."
          : e.status === 410
            ? "These details are no longer stored."
            : e.message || "Could not load details.",
      );
    }
    setRevealing(false);
  };
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const paying = mode === "pay";
  const submit = async () => {
    if (busy) return;
    if (text.trim().length < 3)
      return setError(
        paying ? "Enter the transfer reference." : "Give a reason.",
      );
    setBusy(true);
    try {
      onDone(
        paying
          ? await adminPayoutApi.pay(payout.id, text)
          : await adminPayoutApi.reject(payout.id, text),
      );
    } catch (e) {
      const m = e.errors && Object.values(e.errors)[0];
      setError(
        (Array.isArray(m) ? m[0] : m) || e.message || "Could not update.",
      );
      setBusy(false);
    }
  };
  return (
    <div
      className="ad-modal-backdrop apr-form"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        className="ad-modal"
        role="dialog"
        aria-modal="true"
        aria-label={paying ? "Mark payout as paid" : "Reject payout"}
      >
        <h2>
          {paying
            ? `Pay ${formatINR(payout.amount)} to ${payout.seller.name}`
            : `Reject ${payout.id}`}
        </h2>
        {paying && (
          <>
            <p className="pyo-lead">
              Send the transfer from your bank, then enter the reference below.
            </p>
            <dl className="pyo-dest">
              {where(full || payout.account).map(
                ([k, v]) =>
                  v && (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ),
              )}
            </dl>
            {!full && canReveal && (
              <button
                type="button"
                className="ad-btn ad-btn-ghost ad-btn-sm"
                onClick={reveal}
                disabled={revealing}
              >
                {revealing ? (
                  <Spinner label="Loading…" />
                ) : (
                  "Reveal payment details"
                )}
              </button>
            )}
            {!full && !canReveal && (
              <p className="pyo-note">
                Full details need the Payout details permission.
              </p>
            )}
            {revealError && <p className="apr-note">{revealError}</p>}
          </>
        )}
        {!paying && (
          <p className="pyo-lead">
            The money goes back to the seller's wallet.
          </p>
        )}
        <label className={`apr-field ${error ? "bad" : ""}`}>
          {paying ? "Transfer reference (UTR / transaction id)" : "Reason"}
          <input
            value={text}
            autoFocus
            onChange={(e) => {
              setText(e.target.value);
              setError("");
            }}
            disabled={busy}
            maxLength={paying ? 60 : 255}
          />
          {error && <small>{error}</small>}
        </label>
        <div className="ad-modal-actions">
          <button
            type="button"
            className="ad-btn ad-btn-ghost"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ad-btn ad-btn-primary"
            onClick={submit}
            disabled={busy}
          >
            {busy ? (
              <Spinner label="Saving…" />
            ) : paying ? (
              "Mark as paid"
            ) : (
              "Reject payout"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PayoutsLive({ toast }) {
  const { can } = useAccess();
  const canEdit = can("earnings", "edit") && can("finance", "edit");
  const canReveal = can("finance", "view");
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Pending");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pending, setPending] = useState(null); // { payout, mode }

  const loadSummary = useCallback(
    () =>
      adminPayoutApi
        .summary()
        .then(setSummary)
        .catch(() => {}),
    [],
  );
  const load = useCallback(() => {
    const qs = new URLSearchParams({ page, page_size: pageSize });
    if (status) qs.set("status", status);
    if (query.trim()) qs.set("q", query.trim());
    setError("");
    adminPayoutApi
      .list(`?${qs}`)
      .then(setData)
      .catch((e) => setError(e.message || "Could not load payouts."));
  }, [page, pageSize, status, query]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);
  useEffect(() => {
    const t = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  const done = (row) => {
    const mode = pending.mode;
    setPending(null);
    toast(
      mode === "pay"
        ? `${row.id} marked as paid.`
        : `${row.id} rejected. The money is back in the wallet.`,
    );
    load();
    loadSummary();
  };

  return (
    <>
      {summary ? <Summary s={summary} /> : <SkeletonRows count={1} />}
      {summary && (
        <Rules
          rules={summary.rules}
          canEdit={canEdit}
          toast={toast}
          onSaved={(r) => {
            if (r) setSummary((s) => ({ ...s, rules: r }));
            load();
            loadSummary();
          }}
        />
      )}
      <section className="au-panel">
        <div className="au-toolbar">
          <label className="au-search">
            <Search size={16} />
            <input
              type="search"
              value={query}
              placeholder="Search payout, seller or reference"
              aria-label="Search payouts"
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <div className="au-toolbar-right">
            <label className="au-select">
              <span>Status</span>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {Object.entries(STATUS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                    {data?.counts?.[k] != null ? ` (${data.counts[k]})` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error ? (
          <ErrorState text={error} onRetry={load} />
        ) : !data ? (
          <SkeletonRows count={5} />
        ) : data.results.length === 0 ? (
          <p className="apr-empty">
            {status === "Pending"
              ? "No payouts are waiting. 🎉"
              : "No payouts match."}
          </p>
        ) : (
          <>
            <table className="apr-table">
              <thead>
                <tr>
                  <th>Payout</th>
                  <th>Seller</th>
                  <th>Send to</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.results.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <b>{p.id}</b>
                      <br />
                      <small>
                        {formatDate(p.created_at)}
                        {p.source === "auto" ? " · automatic" : ""}
                      </small>
                    </td>
                    <td>
                      {p.seller.name}
                      <br />
                      <small>
                        {p.seller.type === "remaker" ? "ReMaker" : "Member"} ·{" "}
                        {p.seller.email}
                      </small>
                    </td>
                    <td>
                      <small>
                        {p.account.method === "upi"
                          ? `UPI ${p.account.upi_id}`
                          : `${p.account.bank_name || "Bank"} ${p.account.account_number}`}
                      </small>
                    </td>
                    <td>
                      <b>{formatINR(p.amount)}</b>
                    </td>
                    <td>
                      <span className={`pyo-badge ${p.status}`}>
                        {STATUS[p.status]}
                      </span>
                      {p.reference && (
                        <p className="pyo-note">Ref {p.reference}</p>
                      )}
                      {p.reject_reason && (
                        <p className="apr-note">{p.reject_reason}</p>
                      )}
                    </td>
                    <td>
                      {canEdit && p.status === "Pending" && (
                        <div className="apr-actions">
                          <button
                            type="button"
                            className="ad-btn ad-btn-primary ad-btn-sm"
                            onClick={() =>
                              setPending({ payout: p, mode: "pay" })
                            }
                          >
                            Mark paid
                          </button>
                          <button
                            type="button"
                            className="ad-btn ad-btn-ghost ad-btn-sm"
                            onClick={() =>
                              setPending({ payout: p, mode: "reject" })
                            }
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={data.count}
              onPage={setPage}
              onPageSize={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </>
        )}
      </section>
      {pending && (
        <PayModal
          payout={pending.payout}
          mode={pending.mode}
          canReveal={canReveal}
          onClose={() => setPending(null)}
          onDone={done}
        />
      )}
    </>
  );
}
