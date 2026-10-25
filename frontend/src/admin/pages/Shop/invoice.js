import { formatDate, formatDateTime, formatINR } from "../../utils/format";

/* Opens a printable invoice in a new window (browser "Save as PDF"). */
export function printInvoice(o) {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return false;
  const t = o.transaction;
  const row = (a, b, cls = "") => `<tr class="${cls}"><td>${a}</td><td class="r">${b}</td></tr>`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${o.order_id}</title>
<style>body{font-family:Inter,Arial,sans-serif;color:#13221b;margin:40px;font-size:14px}h1{font-size:24px;margin:0 0 4px}
.top{display:flex;justify-content:space-between;border-bottom:2px solid #0e3a2d;padding-bottom:16px;margin-bottom:22px}
.muted{color:#6a7b72}table{width:100%;border-collapse:collapse;margin:14px 0}td,th{padding:9px 6px;border-bottom:1px solid #e3ebe7;text-align:left}
.r{text-align:right}.tot td{font-weight:700;font-size:16px;border-top:2px solid #0e3a2d}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
h4{margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6a7b72}@media print{button{display:none}}</style></head><body>
<div class="top"><div><h1>ReOrbit</h1><span class="muted">Tax invoice · ${o.order_id}</span></div><div class="r"><strong>${formatDate(o.order_date)}</strong><br><span class="muted">Payment: ${t.payment_status}</span></div></div>
<div class="grid"><div><h4>Billed to</h4><strong>${o.buyer.name}</strong><br>${o.buyer.email}</div>
<div><h4>Deliver to</h4><strong>${o.delivery.name}</strong><br>${o.delivery.address}<br>${o.delivery.city}, ${o.delivery.state} ${o.delivery.pincode}</div></div>
<h4 style="margin-top:24px">Sold by</h4><div>${o.seller.name} (${o.seller.type})</div>
<table><thead><tr><th>Item</th><th class="r">Amount</th></tr></thead><tbody>
${row(`${o.listing.title} × ${o.listing.quantity}<br><span class="muted">${o.listing.category} · ${o.listing.id}</span>`, formatINR(o.subtotal))}
${row("Delivery", o.delivery_fee ? formatINR(o.delivery_fee) : "Free")}
${row("Platform fee", o.platform_fee ? formatINR(o.platform_fee) : "Waived")}
${row("Total", formatINR(o.amount), "tot")}</tbody></table>
<p class="muted">Paid via ${t.payment_method.replace("_", " ")}${t.reference ? ` · ${t.reference}` : ""}${t.transaction_date ? ` on ${formatDateTime(t.transaction_date)}` : ""}.<br>Transaction ${t.transaction_id}.</p>
<button onclick="window.print()" style="padding:10px 18px;border:0;border-radius:10px;background:#0e3a2d;color:#fff;font-size:14px;cursor:pointer">Print / Save as PDF</button>
</body></html>`);
  w.document.close();
  return true;
}
