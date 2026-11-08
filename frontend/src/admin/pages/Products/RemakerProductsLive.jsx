import React, { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";

import {
  deactivateRemakerProduct,
  fetchAdminRemakerProducts,
  reactivateRemakerProduct,
} from "../../../api/adminProducts";
import { useAccess } from "../../data/teamStore";
import { formatINR } from "../../utils/format";
import Pagination from "../../components/ui/Pagination";
import ErrorState from "../../components/ui/ErrorState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import { PRODUCT_ACTION_LIST } from "../../data/productActions";
import { SkeletonRows } from "../../../shared/components/Skeleton";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/products/ProductsReal.css";

const ACTIONS = PRODUCT_ACTION_LIST;
const LABEL = { Draft: "Draft", Listed: "Live", Sold_Out: "Sold out", Inactive: "Off" };

/* Live ReMaker products from the server, moderated by admins. Paged and
   filtered on the server, so it stays fast however many products exist. */
export default function RemakerProductsLive({ toast }) {
  const { can } = useAccess();
  const canEdit = can("products", "edit");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null); // { action, product }

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page, page_size: pageSize });
    if (query.trim()) qs.set("q", query.trim());
    if (status) qs.set("status", status);
    setError("");
    fetchAdminRemakerProducts(`?${qs}`)
      .then(setData)
      .catch((e) => setError(e.message || "Could not load products."));
  }, [page, pageSize, query, status]);

  useEffect(() => {
    const t = setTimeout(load, query ? 300 : 0); // wait for typing to pause
    return () => clearTimeout(t);
  }, [load, query]);

  const confirm = async (reason) => {
    const { action, product } = pending;
    setPending(null);
    try {
      const row =
        action.key === "deactivate"
          ? await deactivateRemakerProduct(product.id, reason)
          : await reactivateRemakerProduct(product.id);
      setData((d) => ({ ...d, results: d.results.map((r) => (r.id === row.id ? row : r)) }));
      toast(`${product.title} ${action.toast}.`);
    } catch (e) {
      toast(e.message || "Could not update the product.");
    }
  };

  return (
    <section className="au-panel">
      <div className="au-toolbar">
        <label className="au-search">
          <Search size={16} />
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search product, ID or ReMaker"
            aria-label="Search products"
          />
        </label>
        <div className="au-toolbar-right">
          <label className="au-select">
            <span>Status</span>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All</option>
              <option value="Listed">Live</option>
              <option value="Sold_Out">Sold out</option>
              <option value="Inactive">Off</option>
              <option value="Draft">Draft</option>
            </select>
          </label>
        </div>
      </div>

      {error ? (
        <ErrorState text={error} onRetry={load} />
      ) : !data ? (
        <SkeletonRows count={6} />
      ) : data.results.length === 0 ? (
        <p className="apr-empty">No ReMaker products match.</p>
      ) : (
        <table className="apr-table">
          <thead>
            <tr><th>Product</th><th>ReMaker</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {data.results.map((p) => {
              const off = !!p.deactivation;
              return (
                <tr key={p.id}>
                  <td>
                    <div className="apr-prod">
                      {p.cover ? <img src={p.cover} alt="" loading="lazy" /> : <span className="apr-noimg" />}
                      <span><b>{p.title}</b><small>{p.id} · {p.category.name}</small></span>
                    </div>
                  </td>
                  <td>{p.remaker.name}<br /><small>@{p.remaker.username}</small></td>
                  <td>{formatINR(Number(p.price))}</td>
                  <td>{p.stock}</td>
                  <td>
                    <span className={`apr-badge ${p.status}`}>{off ? "Switched off" : LABEL[p.status]}</span>
                    {off && <p className="apr-note">{p.deactivation.reason}</p>}
                  </td>
                  <td>
                    <div className="apr-actions">
                      {canEdit && off && (
                        <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm"
                          onClick={() => setPending({ action: ACTIONS.reactivate, product: p })}>Reactivate</button>
                      )}
                      {canEdit && !off && p.status !== "Draft" && (
                        <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm"
                          onClick={() => setPending({ action: ACTIONS.deactivate, product: p })}>Deactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {data && data.count > 0 && (
        <Pagination page={data.page} pageSize={pageSize} total={data.count} onPage={setPage}
          onPageSize={(n) => { setPageSize(n); setPage(1); }} />
      )}

      <ConfirmActionModal
        action={pending?.action}
        targets={pending ? [pending.product.title] : []}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      />
    </section>
  );
}
