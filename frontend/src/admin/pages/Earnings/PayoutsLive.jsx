import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlarmClock, CalendarClock, CheckCircle2, ChevronRight, Search, Truck, X } from "lucide-react";

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

/* "Mon, 24 Nov" */
const day = (v) =>
  v ? new Date(String(v).length === 10 ? `${v}T00:00:00` : v).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "—";
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

/* When a payout has to be sent, and how urgent it is */
function PayBy({ p }) {
  const sc = p.schedule || {};
  if (p.status === "Pending") {
    const left = sc.days_left ?? 0;
    const label =
      sc.state === "overdue"
        ? `Overdue by ${plural(-left, "day")}`
        : sc.state === "today"
          ? "Due today"
          : sc.state === "soon"
            ? "Due tomorrow"
            : `In ${plural(left, "day")}`;
    return (
      <div className="pyo-payby">
        <b>{day(sc.due_by)}</b>
        <span className={`pyo-due ${sc.state}`}>{label}</span>
      </div>
    );
  }
  if (p.status === "Paid")
    return (
      <div className="pyo-payby">
        <b>Paid {day(p.paid_at)}</b>
        <span className={`pyo-due ${sc.paid_on_time === false ? "late" : "done"}`}>
          {sc.paid_on_time === false ? `Late · took ${plural(sc.took_days, "working day")}` : "On time"}
        </span>
      </div>
    );
  return <span className="pyo-muted">—</span>;
}

/* Overdue / due today / next money clearing: what needs doing today */
function DueStrip({ due }) {
  if (!due) return null;
  if (due.overdue || due.due_today)
    return (
      <div className={`pyo-strip ${due.overdue ? "bad" : "warn"}`}>
        <AlarmClock size={18} />
        <div>
          <b>
            {due.overdue ? `${plural(due.overdue, "payout")} overdue (${formatINR(due.overdue_amount)})` : ""}
            {due.overdue && due.due_today ? " · " : ""}
            {due.due_today ? `${plural(due.due_today, "payout")} due today (${formatINR(due.due_today_amount)})` : ""}
          </b>
          <span>Sellers are promised their transfer within {plural(due.sla_days, "working day")} of asking. Oldest first below.</span>
        </div>
      </div>
    );
  return (
    <div className="pyo-strip ok">
      <CheckCircle2 size={18} />
      <div>
        <b>Every payout is on schedule.</b>
        <span>
          {due.next_release_at
            ? `Next seller money clears ${day(due.next_release_at)} · ${formatINR(due.releasing_7d)} clears in the next 7 days.`
            : "No seller money is clearing right now."}{" "}
          Transfers are due within {plural(due.sla_days, "working day")} of a request.
        </span>
      </div>
    </div>
  );
}

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

/* What one payout pays for */
function StatementDrawer({ payout, canEdit, onClose, onAct }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    adminPayoutApi
      .statement(payout.id)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message || "Could not load the statement."));
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      document.removeEventListener("keydown", onKey);
    };
  }, [payout.id, onClose]);
  const p = data?.payout || payout;
  const st = data?.statement;
  const sellerPath = p.seller.type === "remaker" ? `/admin-remakers/${p.seller.id}` : `/admin-users/${p.seller.id}`;
  return (
    <div className="pyo-drawer-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="pyo-drawer" role="dialog" aria-modal="true" aria-label={`Payout ${p.id}`}>
        <header>
          <div>
            <small>{p.id}</small>
            <h3>{formatINR(p.amount)}</h3>
            <span className={`pyo-badge ${p.status}`}>{STATUS[p.status]}</span>
          </div>
          <button type="button" className="pyo-x" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <dl className="pyo-facts">
          <div>
            <dt>Seller</dt>
            <dd>
              <Link to={sellerPath}>{p.seller.name}</Link>
              <small>
                {p.seller.type === "remaker" ? "ReMaker" : "Member"} · {p.seller.email}
              </small>
            </dd>
          </div>
          <div>
            <dt>Requested</dt>
            <dd>
              {formatDate(p.created_at)}
              <small>{p.source === "auto" ? "Created by the automatic run" : "Asked by the seller"}</small>
            </dd>
          </div>
          <div>
            <dt>{p.status === "Paid" ? "Paid" : "Pay by"}</dt>
            <dd>
              <PayBy p={p} />
            </dd>
          </div>
          <div>
            <dt>Send to</dt>
            <dd>
              {p.account.method === "upi" ? `UPI ${p.account.upi_id}` : `${p.account.bank_name || "Bank"} ${p.account.account_number}`}
              {p.account.holder_name && <small>{p.account.holder_name}{p.account.ifsc ? ` · ${p.account.ifsc}` : ""}</small>}
            </dd>
          </div>
          {p.reference && (
            <div>
              <dt>Reference</dt>
              <dd>{p.reference}</dd>
            </div>
          )}
          {p.reject_reason && (
            <div>
              <dt>Rejected</dt>
              <dd>{p.reject_reason}</dd>
            </div>
          )}
        </dl>

        <h4 className="pyo-sub">What this payout covers</h4>
        {error ? (
          <p className="apr-note">{error}</p>
        ) : !st ? (
          <SkeletonRows count={3} />
        ) : (
          <>
            <p className="pyo-muted">
              Earnings that cleared {st.period_from ? `after the previous payout (${formatDate(st.period_from)})` : "since the seller started selling"} and
              before {formatDate(st.period_to)}.
            </p>
            {st.rows.length === 0 ? (
              <p className="pyo-muted">No single order matches: this is balance left over from earlier.</p>
            ) : (
              <ul className="pyo-lines">
                {st.rows.map((r, i) => (
                  <li key={`${r.order}-${r.kind}-${i}`}>
                    <div>
                      {r.order ? <Link to={`/admin-orders/${r.order}`}>{r.order}</Link> : <b>{r.note}</b>}
                      <small>
                        {r.kind === "Reversal" ? "Refunded to the buyer · " : r.delivered_at ? `Delivered ${formatDate(r.delivered_at)} · ` : ""}
                        cleared {formatDate(r.available_at)}
                        {r.managed_delivery && (
                          <em>
                            <Truck size={11} /> ReOrbit delivered (fee not included)
                          </em>
                        )}
                      </small>
                    </div>
                    <b className={r.amount < 0 ? "neg" : ""}>
                      {r.amount < 0 ? "− " : ""}
                      {formatINR(Math.abs(r.amount))}
                    </b>
                  </li>
                ))}
              </ul>
            )}
            <dl className="pyo-total">
              <div>
                <dt>Orders above</dt>
                <dd>{formatINR(st.covered)}</dd>
              </div>
              {st.carried !== 0 && (
                <div>
                  <dt>{st.carried > 0 ? "Earlier balance" : "Left in the wallet"}</dt>
                  <dd>
                    {st.carried < 0 ? "− " : ""}
                    {formatINR(Math.abs(st.carried))}
                  </dd>
                </div>
              )}
              <div className="grand">
                <dt>Payout</dt>
                <dd>{formatINR(p.amount)}</dd>
              </div>
            </dl>
          </>
        )}

        {canEdit && p.status === "Pending" && (
          <footer>
            <button type="button" className="ad-btn ad-btn-ghost" onClick={() => onAct(p, "reject")}>
              Reject
            </button>
            <button type="button" className="ad-btn ad-btn-primary" onClick={() => onAct(p, "pay")}>
              Mark paid
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}

/* Seller money on its way: by the day it clears, and who could be paid right now */
/* one line per ledger entry: seller, order (delivered date), amount; refunds marked */
function MoneyRows({ rows }) {
  if (!rows.length) return <p className="apr-empty">Nothing here.</p>;
  return (
    <table className="apr-table pyo-day-rows">
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.order}-${r.kind}-${i}`}>
            <td>
              <Link to={r.seller.type === "remaker" ? `/admin-remakers/${r.seller.id}` : `/admin-users/${r.seller.id}`}>
                {r.seller.name}
              </Link>
              <br />
              <small>{r.seller.type === "remaker" ? "ReMaker" : "Member"}</small>
            </td>
            <td>
              {r.order ? <Link to={`/admin-orders/${r.order}`}>{r.order}</Link> : "—"}
              {r.delivered_at && (
                <>
                  <br />
                  <small>Delivered {formatDate(r.delivered_at)}{r.managed_delivery ? " · ReOrbit delivery" : ""}</small>
                </>
              )}
            </td>
            <td className="pyo-r">
              <b>
                {r.amount < 0 ? "− " : ""}
                {formatINR(Math.abs(r.amount))}
              </b>
              <br />
              <small>{r.kind === "Reversal" ? "Refund taken back" : "Earning"}</small>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Upcoming({ refreshKey }) {
  const [tab, setTab] = useState("schedule");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  useEffect(() => {
    let alive = true;
    adminPayoutApi
      .upcoming(30)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message || "Could not load."));
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const ready = data?.ready || [];
  return (
    <section className="au-panel pyo-up">
      <div className="pyo-up-head">
        <div>
          <h3>
            <CalendarClock size={17} /> Upcoming money
          </h3>
          <p>When seller earnings become payable. Earnings clear after the hold days set in the rules above.</p>
        </div>
        <div className="arv-chips" role="tablist" aria-label="Upcoming view">
          <button type="button" className={tab === "schedule" ? "on" : ""} onClick={() => setTab("schedule")}>
            Clearing soon{data ? <em>{formatINR(data.total)}</em> : null}
          </button>
          <button type="button" className={tab === "ready" ? "on" : ""} onClick={() => setTab("ready")}>
            Ready to pay{data ? <em>{ready.length}</em> : null}
          </button>
        </div>
      </div>

      {error ? (
        <p className="apr-note">{error}</p>
      ) : !data ? (
        <SkeletonRows count={3} />
      ) : tab === "schedule" ? (
        <>
          <div className="pyo-up-facts">
            <span>
              <b>{formatINR(data.total)}</b> clears in the next {data.days} days
            </span>
            {data.later.amount > 0 && (
              <span>
                <b>{formatINR(data.later.amount)}</b> later
              </span>
            )}
            {data.held_by_returns.amount !== 0 && (
              <button type="button" className="pyo-fact-btn" onClick={() => setOpen(open === "held" ? null : "held")}>
                <b>{formatINR(data.held_by_returns.amount)}</b> frozen by {plural(data.held_by_returns.count, "open return")}
              </button>
            )}
            {data.waiting_for_cod_cash.amount !== 0 && (
              <button type="button" className="pyo-fact-btn" onClick={() => setOpen(open === "cod" ? null : "cod")}>
                <b>{formatINR(data.waiting_for_cod_cash.amount)}</b> waiting for COD cash ({plural(data.waiting_for_cod_cash.count, "order")})
              </button>
            )}
          </div>
          {open === "cod" && (
            <div className="pyo-side-list">
              <p className="pyo-muted">
                Cash-on-delivery orders start clearing only once you confirm ReOrbit received the cash (Orders › COD cash).
              </p>
              <MoneyRows rows={data.waiting_for_cod_cash.rows || []} />
            </div>
          )}
          {open === "held" && (
            <div className="pyo-side-list">
              <p className="pyo-muted">These clear once the return is closed.</p>
              <MoneyRows rows={data.held_by_returns.rows || []} />
            </div>
          )}
          {data.schedule.length === 0 ? (
            <p className="apr-empty">Nothing clears in the next {data.days} days.</p>
          ) : (
            <ul className="pyo-days">
              {data.schedule.map((d) => (
                <li key={d.date} className={open === d.date ? "open" : ""}>
                  <button type="button" onClick={() => setOpen(open === d.date ? null : d.date)} aria-expanded={open === d.date}>
                    <span className="pyo-day">{day(d.date)}</span>
                    <span className="pyo-muted">
                      {plural(d.sellers ?? new Set(d.rows.map((r) => r.seller.id)).size, "seller")} ·{" "}
                      {plural(d.orders ?? new Set(d.rows.map((r) => r.order)).size, "order")}
                      {d.refunded < 0 && (
                        <>
                          {" "}
                          · earned {formatINR(d.earned)}, refunded {formatINR(Math.abs(d.refunded))}
                        </>
                      )}
                    </span>
                    <b>{formatINR(d.amount)}</b>
                    <ChevronRight size={15} className="pyo-chev" />
                  </button>
                  {open === d.date && <MoneyRows rows={d.rows} />}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : ready.length === 0 ? (
        <p className="apr-empty">No seller has cleared money waiting right now.</p>
      ) : (
        <>
          <p className="pyo-muted" style={{ marginTop: 0 }}>
            Money that has cleared and has no payout yet.{" "}
            {data.auto
              ? `The automatic run creates a payout for anyone at ${formatINR(data.min_amount)} or more with saved details.`
              : `Automatic payouts are off: these sellers can ask for a payout once they reach ${formatINR(data.min_amount)}.`}
          </p>
          <table className="apr-table">
            <thead>
              <tr>
                <th>Seller</th>
                <th>Cleared since</th>
                <th>Last paid</th>
                <th>Payout details</th>
                <th className="pyo-r">Available</th>
              </tr>
            </thead>
            <tbody>
              {ready.map((r) => (
                <tr key={`${r.seller.type}-${r.seller.id}`}>
                  <td>
                    <Link to={r.seller.type === "remaker" ? `/admin-remakers/${r.seller.id}` : `/admin-users/${r.seller.id}`}>
                      {r.seller.name}
                    </Link>
                    <br />
                    <small>
                      {r.seller.type === "remaker" ? "ReMaker" : "Member"} · {r.seller.email}
                    </small>
                  </td>
                  <td>{formatDate(r.available_since)}</td>
                  <td>{r.last_paid_at ? formatDate(r.last_paid_at) : <span className="pyo-muted">Never</span>}</td>
                  <td>
                    {r.has_account ? (
                      <span className="pyo-due done">Saved</span>
                    ) : (
                      <span className="pyo-due overdue">Missing</span>
                    )}
                  </td>
                  <td className="pyo-r">
                    <b>{formatINR(r.available)}</b>
                    {!r.meets_minimum && <small className="pyo-muted"> below minimum</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
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
  const [viewing, setViewing] = useState(null); // payout shown in the statement drawer
  const [refreshKey, setRefreshKey] = useState(0);
  const closeView = useCallback(() => setViewing(null), []);

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
    setViewing(null);
    load();
    loadSummary();
    setRefreshKey((k) => k + 1);
  };

  return (
    <>
      {summary && <DueStrip due={summary.due} />}
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
                  <th>Pay by</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.results.map((p) => (
                  <tr key={p.id} className={p.schedule?.state === "overdue" ? "pyo-row-late" : ""}>
                    <td>
                      <button type="button" className="pyo-link" onClick={() => setViewing(p)}>
                        {p.id}
                      </button>
                      <br />
                      <small>
                        Asked {formatDate(p.created_at)}
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
                      <PayBy p={p} />
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
                      <div className="apr-actions">
                        <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setViewing(p)}>
                          Details
                        </button>
                      </div>
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
      <Upcoming refreshKey={refreshKey} />
      {viewing && (
        <StatementDrawer
          payout={viewing}
          canEdit={canEdit}
          onClose={closeView}
          onAct={(payout, mode) => setPending({ payout, mode })}
        />
      )}
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
