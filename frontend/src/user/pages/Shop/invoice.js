import { PAYMENT_LABEL } from "../../data/ordersStore";
import { formatDate } from "../../utils/format";
import { getRules } from "../../../shared/platformRules";

/* Everything typed by a seller or buyer is escaped: this page is written into a window on our own origin. */
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* 12,345 -> "Twelve Thousand Three Hundred Forty-Five" (Indian system: lakh, crore) */
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven",
  "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const two = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`);
const three = (n) =>
  [n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred` : "", n % 100 ? two(n % 100) : ""].filter(Boolean).join(" ");
export function inWords(amount) {
  let n = Math.floor(Number(amount) || 0);
  if (n === 0) return "Zero";
  const parts = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (n) parts.push(three(n));
  return parts.join(" ");
}

const sellerKind = (o) =>
  o.seller?.type === "platform" || o.seller?.name === "ReOrbit"
    ? "ReOrbit store"
    : o.seller?.type === "remaker" || o.sellerIsRemaker
      ? "ReMaker"
      : "Community seller";

/* Opens a printable invoice in a new window (browser "Save as PDF").
   `o` is an order from useOrder / useOrders. Returns false if blocked. */
export function printInvoice(o) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return false;

  const paid = o.paymentStatus === "Paid" || o.codCollected || (o.payment !== "COD" && !o.awaitingPayment);
  const cancelled = o.cancelled;
  const status = cancelled ? "Cancelled" : paid ? "Paid" : "Payment due on delivery";
  const tone = cancelled ? "bad" : paid ? "good" : "wait";
  const a = o.address || {};
  const s = o.seller || {};
  const sellerAddr = s.address
    ? [s.address.line1, s.address.city, s.address.state, s.address.pincode].filter(Boolean).join(", ")
    : s.city || "";
  const support = s.email || getRules()?.supportEmail || "support@reorbit.in";
  const lines = o.lines || [];
  const subtotal = o.subtotal ?? lines.reduce((n, l) => n + (l.line_total || 0), 0);
  const invNo = `INV-${String(o.id).replace(/^ORD-/, "")}`;
  const itemCount = lines.reduce((n, l) => n + (l.qty || 0), 0);

  const items = lines
    .map(
      (ln, i) => `<tr>
  <td class="c">${i + 1}</td>
  <td><strong>${esc(ln.title)}</strong>${ln.id ? `<br><span class="muted sm">${esc(ln.id)}</span>` : ""}</td>
  <td class="c">${esc(ln.qty)}</td>
  <td class="r">${inr(ln.unit_price)}</td>
  <td class="r">${inr(ln.line_total)}</td>
</tr>`,
    )
    .join("");

  const sum = (label, value, cls = "") => `<div class="${cls}"><span>${label}</span><b>${value}</b></div>`;

  w.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>Invoice ${esc(invNo)} · ReOrbit</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}
body{margin:0;background:#eef1ee;font-family:"Plus Jakarta Sans","Segoe UI",Arial,sans-serif;color:#1f2923;font-size:13px;line-height:1.5}
.sheet{max-width:820px;margin:28px auto;background:#fff;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.08);overflow:hidden}
.band{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding:28px 36px;background:#2a4d3a;color:#fff}
.brand{display:flex;align-items:center;gap:12px}
.mark{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:#fff;color:#2a4d3a;font-weight:800;font-size:20px}
.brand h1{margin:0;font-size:22px;letter-spacing:.01em}
.brand small{display:block;opacity:.75;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase}
.doc{text-align:right}
.doc h2{margin:0;font-size:20px;letter-spacing:.14em}
.doc p{margin:4px 0 0;opacity:.85}
.pad{padding:26px 36px}
.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid #dce5de;border-radius:12px;overflow:hidden}
.meta div{padding:12px 14px;border-right:1px solid #dce5de}
.meta div:last-child{border-right:0}
.lbl{display:block;margin-bottom:3px;color:#6b756d;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11.5px;font-weight:700}
.badge.good{background:#e3f1e8;color:#2a7a4f}.badge.wait{background:#fdf1e2;color:#a35a14}.badge.bad{background:#fbe9e7;color:#a8433a}
.parties{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px}
.party{padding:14px 16px;border:1px solid #dce5de;border-radius:12px;background:#fbfcfb}
.party strong{display:block;font-size:14px}
.muted{color:#6b756d}.sm{font-size:11.5px}
table{width:100%;border-collapse:collapse;margin-top:22px}
thead th{padding:10px 12px;background:#f2f6f3;color:#4a5a50;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;text-align:left;border-bottom:1px solid #dce5de}
tbody td{padding:12px;border-bottom:1px solid #edf1ee;vertical-align:top}
.c{text-align:center}.r{text-align:right}
.bottom{display:grid;grid-template-columns:1fr 300px;gap:24px;margin-top:20px;align-items:start}
.words{padding:14px 16px;border:1px dashed #c8d6cc;border-radius:12px;background:#fbfcfb}
.words b{display:block;margin-top:2px;font-size:13px}
.totals{border:1px solid #dce5de;border-radius:12px;overflow:hidden}
.totals div{display:flex;justify-content:space-between;gap:12px;padding:9px 14px;border-bottom:1px solid #edf1ee}
.totals div:last-child{border-bottom:0}
.totals .save b{color:#2a7a4f}
.totals .grand{background:#2a4d3a;color:#fff;font-size:15px}
.info{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}
.info .party p{margin:2px 0}
.foot{display:flex;justify-content:space-between;gap:20px;padding:18px 36px;border-top:1px solid #dce5de;background:#fafbf9;color:#6b756d;font-size:11.5px}
.stamp{display:inline-block;margin-top:8px;padding:4px 12px;border:2px solid currentColor;border-radius:8px;font-weight:800;letter-spacing:.12em;transform:rotate(-4deg)}
.stamp.good{color:#2a7a4f}.stamp.bad{color:#a8433a}.stamp.wait{color:#a35a14}
.actions{max-width:820px;margin:0 auto 28px;text-align:right}
.actions button{padding:11px 22px;border:0;border-radius:999px;background:#2a4d3a;color:#fff;font:inherit;font-weight:700;cursor:pointer}
@media (max-width:640px){.band,.pad,.foot{padding-left:18px;padding-right:18px}.meta{grid-template-columns:1fr 1fr}.meta div:nth-child(2){border-right:0}.meta div:nth-child(-n+2){border-bottom:1px solid #dce5de}.parties,.info,.bottom{grid-template-columns:1fr}}
@media print{body{background:#fff}.sheet{margin:0;box-shadow:none;border-radius:0}.actions{display:none}.band,.totals .grand,thead th{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="sheet">
  <div class="band">
    <div class="brand"><span class="mark">R</span><div><h1>ReOrbit</h1><small>Reuse · Recreate · Reimagine</small></div></div>
    <div class="doc"><h2>TAX INVOICE</h2><p>${esc(invNo)}</p></div>
  </div>

  <div class="pad">
    <div class="meta">
      <div><span class="lbl">Invoice date</span><strong>${formatDate(o.deliveredAt || o.placedAt)}</strong></div>
      <div><span class="lbl">Order</span><strong>${esc(o.id)}</strong><br><span class="muted sm">Placed ${formatDate(o.placedAt)}</span></div>
      <div><span class="lbl">Items</span><strong>${itemCount}</strong></div>
      <div><span class="lbl">Status</span><span class="badge ${tone}">${status}</span></div>
    </div>

    <div class="parties">
      <div class="party"><span class="lbl">Sold by</span><strong>${esc(s.name || "ReOrbit")}</strong>
        <span class="muted">${sellerKind(o)}</span>${sellerAddr ? `<br>${esc(sellerAddr)}` : ""}${s.phone ? `<br>${esc(s.phone)}` : ""}</div>
      <div class="party"><span class="lbl">Billed to</span><strong>${esc(a.name)}</strong>
        ${esc(a.line)}<br>${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}${a.phone ? `<br>${esc(a.phone)}` : ""}</div>
      <div class="party"><span class="lbl">Shipped to</span><strong>${esc(a.name)}</strong>
        ${esc(a.line)}<br>${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}</div>
    </div>

    <table>
      <thead><tr><th class="c" style="width:44px">#</th><th>Item</th><th class="c" style="width:60px">Qty</th><th class="r" style="width:120px">Unit price</th><th class="r" style="width:130px">Amount</th></tr></thead>
      <tbody>${items}</tbody>
    </table>

    <div class="bottom">
      <div>
        <div class="words"><span class="lbl">Amount in words</span><b>Rupees ${inWords(o.total)} Only</b></div>
        <div class="info">
          <div class="party"><span class="lbl">Payment</span>
            <p><strong>${esc(PAYMENT_LABEL[o.payment] || o.payment)}</strong></p>
            ${o.reference ? `<p class="muted sm">Ref ${esc(o.reference)}</p>` : ""}
            <span class="stamp ${tone}">${cancelled ? "CANCELLED" : paid ? "PAID" : "DUE"}</span></div>
          <div class="party"><span class="lbl">Delivery</span>
            <p><strong>${o.managedDelivery ? "Managed by ReOrbit" : o.courier?.name ? esc(o.courier.name) : "Shipped by the seller"}</strong></p>
            ${o.courier?.awb ? `<p class="muted sm">Tracking ${esc(o.courier.awb)}</p>` : ""}
            ${o.deliveredAt ? `<p class="muted sm">Delivered ${formatDate(o.deliveredAt)}</p>` : ""}</div>
        </div>
      </div>
      <div class="totals">
        ${sum("Subtotal", inr(subtotal))}
        ${o.discount ? sum("Voucher discount", `− ${inr(o.discount)}`, "save") : ""}
        ${sum("Delivery", o.shipping ? inr(o.shipping) : "Free")}
        ${o.platformFee ? sum("Platform fee", inr(o.platformFee)) : ""}
        ${sum(paid ? "Total paid" : "Total payable", inr(o.total), "grand")}
      </div>
    </div>
  </div>

  <div class="foot">
    <div>This is a computer-generated invoice and needs no signature.<br>Every piece on ReOrbit is pre-loved or remade, keeping it out of landfill. Thank you.</div>
    <div style="text-align:right">Questions about this order?<br><strong style="color:#2a4d3a">${esc(support)}</strong></div>
  </div>
</div>
<div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
</body></html>`);
  w.document.close();
  return true;
}
