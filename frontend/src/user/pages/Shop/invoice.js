import { PAYMENT_LABEL } from "../../data/ordersStore";
import { formatDate } from "../../utils/format";

/* Everything typed by a seller or buyer is escaped: this page is written into a window on our own origin. */
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

/* Opens a printable invoice in a new window (browser "Save as PDF").
   `o` is an order from useOrder / useOrders. Returns false if blocked. */
export function printInvoice(o) {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return false;

  const row = (a, b, cls = "") =>
    `<tr class="${cls}"><td>${a}</td><td class="r">${b}</td></tr>`;
  const paid = o.paymentStatus === "Paid" || (o.payment !== "COD" && !o.awaitingPayment);
  const a = o.address;

  w.document
    .write(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(o.id)}</title>
<style>body{font-family:"Plus Jakarta Sans",Arial,sans-serif;color:#1f2923;margin:40px;font-size:14px}h1{font-size:26px;margin:0 0 4px;color:#2a4d3a}
.top{display:flex;justify-content:space-between;border-bottom:2px solid #2a4d3a;padding-bottom:16px;margin-bottom:22px}
.muted{color:#6b756d}table{width:100%;border-collapse:collapse;margin:14px 0}td,th{padding:9px 6px;border-bottom:1px solid #dce5de;text-align:left}
.r{text-align:right}.tot td{font-weight:700;font-size:16px;border-top:2px solid #2a4d3a}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
h4{margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b756d}@media print{button{display:none}}</style></head><body>
<div class="top"><div><h1>ReOrbit</h1><span class="muted">Tax invoice · ${esc(o.id)}</span></div><div class="r"><strong>${formatDate(o.placedAt)}</strong><br><span class="muted">Payment: ${paid ? "Paid" : "Pending (pay on delivery)"}</span></div></div>
<div class="grid"><div><h4>Billed to</h4><strong>${esc(a.name)}</strong><br>${esc(a.line)}, ${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}<br>${esc(a.phone)}</div>
<div><h4>Sold by</h4><strong>${esc(o.seller?.name)}</strong><br><span class="muted">${o.seller?.name === "ReOrbit" ? "ReOrbit store" : o.sellerIsRemaker ? "ReMaker" : "Community seller"}</span></div></div>
<table><thead><tr><th>Item</th><th class="r">Amount</th></tr></thead><tbody>
${o.lines.map((ln) => row(`${esc(ln.title)}<br><span class="muted">${ln.qty} × ${inr(ln.unit_price)}</span>`, inr(ln.line_total))).join("")}
${row("Delivery", o.shipping ? inr(o.shipping) : "Free")}
${o.platformFee ? row("Platform fee", inr(o.platformFee)) : ""}
${o.discount ? row("Discount", `− ${inr(o.discount)}`) : ""}
${row(paid ? "Total paid" : "Total to pay on delivery", inr(o.total), "tot")}
</tbody></table>
<p class="muted">Payment method: ${esc(PAYMENT_LABEL[o.payment] || o.payment)}${o.reference ? ` · ${esc(o.reference)}` : ""}</p>
<p class="muted">Thank you for choosing second-life products with ReOrbit.</p>
<button onclick="window.print()" style="margin-top:12px;padding:10px 18px;border-radius:999px;border:0;background:#2a4d3a;color:#fff;font-weight:700;cursor:pointer">Print / Save as PDF</button>
</body></html>`);
  w.document.close();
  return true;
}
