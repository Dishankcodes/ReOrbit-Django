import React, { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";

import { adminRefundApi } from "../../../api/orders";
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

const STATUS = { Pending: "Waiting", Failed: "Needs attention", Done: "Refunded" };
const BADGE = { Pending: "Pending", Failed: "Rejected", Done: "Paid" }; /* reuse the payout badge colours */

function SendModal({ refund, onClose, onDone }) {
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    if (ref.trim().length < 3) return setError("Enter the transfer reference.");
    setBusy(true);
    try {
      onDone(await adminRefundApi.markPaid(refund.id, ref));
    } catch (e) {
      setError(e.status === 403 ? "You need the Payout details (finance) permission." : e.message || "Could not update.");
      setBusy(false);
    }
  };
  return (
    <div className="ad-modal-backdrop apr-form" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="ad-modal" role="dialog" aria-modal="true" aria-label="Mark refund as sent">
        <h2>Send {formatINR(refund.amount)} to {refund.buyer.name}</h2>
        <p className="pyo-lead">
          This was a cash-on-delivery order, so there is no online payment to reverse. Ask the buyer ({refund.buyer.email}) where to send it,
          transfer it from your bank, then enter the reference.
        </p>
        <label className={`apr-field ${error ? "bad" : ""}`}>Transfer reference (UTR / transaction id)
          <input value={ref} autoFocus onChange={(e) => { setRef(e.target.value); setError(""); }} disabled={busy} maxLength={60} />
          {error && <small>{error}</small>}
        </label>
        <div className="ad-modal-actions">
          <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="ad-btn ad-btn-primary" onClick={submit} disabled={busy}>{busy ? <Spinner label="Saving…" /> : "Mark as sent"}</button>
        </div>
      </div>
    </div>
  );
}

/* Every refund ReOrbit owes or has sent. Failed online refunds can be retried; cash-on-delivery
   refunds are sent by hand and recorded here. */
export default function RefundsLive({ toast }) {
  const { can } = useAccess();
  const canAct = can("finance", "edit");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [busyId, setBusyId] = useState("");
  const [sending, setSending] = useState(null);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page, page_size: pageSize });
    if (status) qs.set("status", status);
    if (query.trim()) qs.set("q", query.trim());
    setError("");
    adminRefundApi.list(`?${qs}`).then(setData).catch((e) => setError(e.message || "Could not load refunds."));
  }, [page, pageSize, status, query]);

  useEffect(() => {
    const t = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  const retry = async (r) => {
    if (busyId) return;
    setBusyId(r.id);
    try {
      const res = await adminRefundApi.retry(r.id);
      toast(res.refund.status === "Done" ? `${r.id} refunded.` : "Razorpay still could not send it. Try again later.");
      load();
    } catch (e) {
      toast(e.message || "Could not retry.");
    }
    setBusyId("");
  };

  return (
    <>
      <section className="au-panel">
        <div className="au-toolbar">
          <label className="au-search">
            <Search size={16} />
            <input type="search" value={query} placeholder="Search refund, order or reference" aria-label="Search refunds"
              onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          </label>
          <div className="au-toolbar-right">
            <label className="au-select"><span>Status</span>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">All</option>
                {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}{data?.counts?.[k] != null ? ` (${data.counts[k]})` : ""}</option>)}
              </select>
            </label>
          </div>
        </div>
        {error ? <ErrorState text={error} onRetry={load} /> : !data ? <SkeletonRows count={5} /> : data.results.length === 0 ? (
          <p className="apr-empty">No refunds match.</p>
        ) : (
          <>
            <table className="apr-table">
              <thead><tr><th>Refund</th><th>Order</th><th>Buyer</th><th>Amount</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.id}</b><br /><small>{formatDate(r.created_at)} · {r.reason_label}</small></td>
                    <td>{r.order || r.payment}<br /><small>{r.method === "RAZORPAY" ? "Back to Razorpay" : "Send by hand (COD)"}</small></td>
                    <td>{r.buyer.name}<br /><small>{r.buyer.email}</small></td>
                    <td><b>{formatINR(r.amount)}</b></td>
                    <td>
                      <span className={`pyo-badge ${BADGE[r.status]}`}>{STATUS[r.status]}</span>
                      {r.reference && <p className="pyo-note">Ref {r.reference}</p>}
                      {r.status === "Failed" && r.last_error && <p className="apr-note">{r.last_error} (tried {r.attempts}×)</p>}
                    </td>
                    <td>
                      {canAct && r.status === "Failed" && r.method === "RAZORPAY" && (
                        <div className="apr-actions">
                          <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" disabled={!!busyId} onClick={() => retry(r)}>
                            {busyId === r.id ? <Spinner /> : "Retry"}
                          </button>
                          <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setSending(r)}>Sent by hand</button>
                        </div>
                      )}
                      {canAct && r.status === "Pending" && r.method === "MANUAL" && (
                        <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => setSending(r)}>Mark as sent</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pageSize={pageSize} total={data.count} onPage={setPage}
              onPageSize={(n) => { setPageSize(n); setPage(1); }} />
          </>
        )}
      </section>
      {sending && <SendModal refund={sending} onClose={() => setSending(null)}
        onDone={(r) => { setSending(null); toast(`${r.id} marked as sent.`); load(); }} />}
    </>
  );
}
