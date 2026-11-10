import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, PackageX, RotateCcw, Undo2, ImagePlus, X } from "lucide-react";

import { orderOptionsApi } from "../../api/orders";
import { requestReturn, returnAction } from "../../user/data/ordersStore";
import Spinner from "./Spinner";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const day = (v) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "");

const STATUS_TEXT = {
  Requested: "Waiting for the seller to answer",
  Approved: "Approved. Send the item back",
  Rejected: "The seller rejected this return",
  Escalated: "ReOrbit is reviewing it",
  Refunded: "Refunded",
  Closed: "Closed, no refund",
};

/* Everything a buyer needs after delivery: a failed delivery notice, asking for a return,
   following it, taking it to ReOrbit, and the refund. Works for members, ReMakers and admins. */
export default function ReturnPanel({ order }) {
  const [opts, setOpts] = useState(null);
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState({ reason: "", details: "" });
  const [files, setFiles] = useState([]);
  const [errs, setErrs] = useState({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const pick = useRef(null);
  const rr = order.returnReq;

  useEffect(() => {
    if (open || rr) orderOptionsApi.get().then(setOpts).catch(() => {});
  }, [open, rr]);

  const fault = opts?.return_reasons?.find((r) => r.code === vals.reason)?.fault;
  const maxPhotos = opts?.max_photos || 4;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrs({});
    setMsg("");
    const form = new FormData();
    form.append("reason", vals.reason);
    form.append("details", vals.details);
    files.forEach((f) => form.append("photos", f));
    try {
      await requestReturn(order.id, form);
      setOpen(false);
      setFiles([]);
    } catch (err) {
      setErrs(err.errors || {});
      setMsg(err.message || "Could not send your request.");
    }
    setBusy(false);
  };

  const act = async (action) => {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      await returnAction(order.id, action);
    } catch (err) {
      setMsg(err.message || "Something went wrong.");
    }
    setBusy(false);
  };

  const refundRows = order.refunds || [];

  return (
    <>
      {order.failed && (
        <div className="dn-banner dn-banner--bad ob-banner">
          <PackageX size={20} />
          <div>
            <strong>{order.apiStatus === "Returned_To_Origin" ? "The parcel went back to the seller" : "Delivery did not happen"}</strong>
            {order.failed.label}.{" "}
            {order.apiStatus === "Returned_To_Origin"
              ? order.payment === "COD" ? "Nothing was charged." : "Your refund is on its way."
              : "The seller will try again or the parcel goes back to them."}
          </div>
        </div>
      )}

      {order.codCollected && (
        <div className="dn-banner ob-banner"><RotateCcw size={20} /><div><strong>Paid on delivery</strong>Thank you. ReOrbit is confirming the cash with the courier.</div></div>
      )}

      {rr && (
        <section className="dn-card dn-card-pad" style={{ marginBottom: 16 }}>
          <div className="dn-card-head"><h3>Your return</h3><Undo2 size={18} /></div>
          <p style={{ margin: "0 0 6px" }}><b>{STATUS_TEXT[rr.status] || rr.status}</b> · {rr.reason.label}</p>
          {rr.details && <p className="dn-muted" style={{ margin: "0 0 8px" }}>{rr.details}</p>}
          {rr.photos?.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 10px" }}>
              {rr.photos.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" width={64} height={64} style={{ objectFit: "cover", borderRadius: 8 }} /></a>)}
            </div>
          )}
          {rr.seller_note && <p style={{ margin: "0 0 6px" }}><b>Seller:</b> {rr.seller_note}</p>}
          {rr.admin_note && <p style={{ margin: "0 0 6px" }}><b>ReOrbit:</b> {rr.admin_note}</p>}
          {["Requested", "Approved", "Escalated"].includes(rr.status) && (
            <p className="dn-muted" style={{ margin: "0 0 8px" }}>
              Expected refund {inr(rr.expected_refund)}. Return shipping is paid by {rr.return_shipping_paid_by === "seller" ? "the seller" : "you"}.
            </p>
          )}
          {rr.status === "Refunded" && <p style={{ margin: "0 0 8px" }}>Refunded {inr(rr.refund_amount)}{order.payment === "COD" ? " by ReOrbit (bank/UPI transfer)." : " to your original payment method."}</p>}
          {rr.can_escalate && <p className="dn-muted" style={{ margin: "0 0 8px" }}>Disagree? You can ask ReOrbit to review it until {day(rr.escalate_until)}.</p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {rr.can_escalate && <button type="button" className="dn-btn" disabled={busy} onClick={() => act("escalate")}>{busy ? <Spinner /> : "Ask ReOrbit to review"}</button>}
            {rr.can_withdraw && <button type="button" className="dn-btn dn-btn--ghost" disabled={busy} onClick={() => act("withdraw")}>Withdraw request</button>}
          </div>
          {msg && <p className="dn-error" role="alert">{msg}</p>}
        </section>
      )}

      {!rr && order.canReturn && (
        <section className="dn-card dn-card-pad" style={{ marginBottom: 16 }}>
          <div className="dn-card-head"><h3>Something wrong with it?</h3><Undo2 size={18} /></div>
          {!open ? (
            <>
              <p className="dn-muted" style={{ margin: "0 0 10px" }}>You can ask for a return until {day(order.returnUntil)}.</p>
              <button type="button" className="dn-btn" onClick={() => setOpen(true)}>Return this order</button>
            </>
          ) : (
            <form onSubmit={submit} noValidate>
              <label className="dn-field">
                <span className="dn-label">Reason</span>
                <select className="dn-select" value={vals.reason} onChange={(e) => setVals({ ...vals, reason: e.target.value })}>
                  <option value="">Choose a reason</option>
                  {(opts?.return_reasons || []).map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                </select>
                {errs.reason && <small className="dn-error">{errs.reason[0]}</small>}
              </label>
              <label className="dn-field">
                <span className="dn-label">What happened?</span>
                <textarea className="dn-input" rows={3} maxLength={500} value={vals.details} onChange={(e) => setVals({ ...vals, details: e.target.value })} />
                {errs.details && <small className="dn-error">{errs.details[0]}</small>}
              </label>
              <div className="dn-field">
                <span className="dn-label">Photos {fault === "seller" ? "(at least one)" : "(optional)"}</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {files.map((f, i) => (
                    <span key={`${f.name}-${i}`} style={{ position: "relative" }}>
                      <img src={URL.createObjectURL(f)} alt="" width={64} height={64} style={{ objectFit: "cover", borderRadius: 8 }} />
                      <button type="button" aria-label="Remove photo" onClick={() => setFiles(files.filter((_, j) => j !== i))}
                        style={{ position: "absolute", top: -6, right: -6, borderRadius: 99, border: 0, width: 20, height: 20, cursor: "pointer" }}><X size={12} /></button>
                    </span>
                  ))}
                  {files.length < maxPhotos && (
                    <button type="button" className="dn-btn dn-btn--ghost dn-btn--sm" onClick={() => pick.current?.click()}><ImagePlus size={14} /> Add photo</button>
                  )}
                  <input ref={pick} type="file" accept="image/*" multiple hidden
                    onChange={(e) => { setFiles([...files, ...Array.from(e.target.files || [])].slice(0, maxPhotos)); e.target.value = ""; }} />
                </div>
                {errs.photos && <small className="dn-error">{errs.photos[0]}</small>}
              </div>
              {fault && (
                <p className="dn-muted" style={{ margin: "0 0 10px" }}>
                  {fault === "seller" ? "The seller pays return shipping and you get the delivery fee back too." : "You pay return shipping and the delivery fee is not refunded."}
                </p>
              )}
              {msg && <p className="dn-error" role="alert"><AlertTriangle size={14} /> {msg}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="dn-btn" disabled={busy}>{busy ? <Spinner /> : "Send request"}</button>
                <button type="button" className="dn-btn dn-btn--ghost" onClick={() => setOpen(false)}>Not now</button>
              </div>
            </form>
          )}
        </section>
      )}

      {refundRows.length > 0 && (
        <section className="dn-card dn-card-pad" style={{ marginBottom: 16 }}>
          <div className="dn-card-head"><h3>Refunds</h3></div>
          {refundRows.map((r) => (
            <p key={r.id} style={{ margin: "0 0 4px" }}>
              {inr(r.amount)} · {r.status === "Done" ? `sent ${day(r.processed_at)}` : r.status === "Failed" ? "delayed, ReOrbit is sorting it out" : "on its way"}
              {r.method === "MANUAL" && r.reference ? ` · ref ${r.reference}` : ""}
            </p>
          ))}
        </section>
      )}
    </>
  );
}
