import React, { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { fetchAdminListings, moderateListing } from "../../../api/listings";
import { useAccess } from "../../data/teamStore";
import { ITEM_STATUS_LABEL, LISTING_ACTIONS } from "../../data/listingModeration";
import { formatINR } from "../../utils/format";
import Pagination from "../../components/ui/Pagination";
import ErrorState from "../../components/ui/ErrorState";
import StatusBadge from "../../components/ui/StatusBadge";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import { SkeletonRows } from "../../../shared/components/Skeleton";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/products/ProductsReal.css";

/* Member listings (LST-…) from the server. Flag, disable or enable them here;
   the same change shows on the marketplace and in the seller's My Listings. */
export default function MemberListingsLive({ toast }) {
  const navigate = useNavigate();
  const { can } = useAccess();
  const canEdit = can("products", "edit");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [moderation, setModeration] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null); // { action, listing }

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page, page_size: pageSize });
    if (query.trim()) qs.set("q", query.trim());
    if (status) qs.set("status", status);
    if (moderation) qs.set("moderation", moderation);
    setError("");
    fetchAdminListings(`?${qs}`)
      .then(setData)
      .catch((e) => setError(e.message || "Could not load listings."));
  }, [page, pageSize, query, status, moderation]);

  useEffect(() => {
    const t = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  const confirm = async (reason) => {
    const { action, listing } = pending;
    setPending(null);
    try {
      const row = await moderateListing(listing.id, action.status, reason);
      setData((d) => ({
        ...d,
        results: d.results.map((r) => (r.id === row.id ? row : r)),
      }));
      toast(`${listing.title} ${action.toast}.`);
    } catch (e) {
      toast(e.message || "Could not update the listing.");
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
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search listing, ID or seller"
            aria-label="Search listings"
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
              {Object.entries(ITEM_STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="au-select">
            <span>Moderation</span>
            <select
              value={moderation}
              onChange={(e) => {
                setModeration(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="Flagged">Flagged</option>
              <option value="Disabled">Disabled</option>
              <option value="Normal">Normal</option>
            </select>
          </label>
        </div>
      </div>

      {error ? (
        <ErrorState text={error} onRetry={load} />
      ) : !data ? (
        <SkeletonRows count={6} />
      ) : data.results.length === 0 ? (
        <p className="apr-empty">No member listings match.</p>
      ) : (
        <table className="apr-table">
          <thead>
            <tr>
              <th>Listing</th>
              <th>Seller</th>
              <th>Price</th>
              <th>Qty</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.results.map((p) => {
              const mod = p.moderation_status;
              return (
                <tr
                  key={p.id}
                  className="apr-row-link"
                  tabIndex={0}
                  onClick={() => navigate(`/admin-products/${p.id}`)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    e.target === e.currentTarget &&
                    navigate(`/admin-products/${p.id}`)
                  }
                >
                  <td>
                    <div className="apr-prod">
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt="" loading="lazy" />
                      ) : (
                        <span className="apr-noimg" />
                      )}
                      <span>
                        <b>{p.title}</b>
                        <small>
                          {p.id} · {p.category.name}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td>
                    {p.seller.name}
                    <br />
                    <small>{p.seller.email}</small>
                  </td>
                  <td>
                    {p.listing_price != null
                      ? formatINR(Number(p.listing_price))
                      : "—"}
                    {p.suggestion_status === "Pending" && (
                      <p className="apr-note">
                        Suggested {formatINR(Number(p.suggested_price))}
                      </p>
                    )}
                  </td>
                  <td>{p.quantity}</td>
                  <td>
                    <StatusBadge
                      status={
                        mod !== "Normal"
                          ? mod
                          : p.item_status === "Listed"
                            ? "Live"
                            : p.item_status
                      }
                    />
                    {mod !== "Normal" && (
                      <p className="apr-note">{p.moderation_note}</p>
                    )}
                  </td>
                  <td>
                    <div
                      className="apr-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canEdit && mod !== "Normal" && (
                        <button
                          type="button"
                          className="ad-btn ad-btn-ghost ad-btn-sm"
                          onClick={() =>
                            setPending({ action: LISTING_ACTIONS.enable, listing: p })
                          }
                        >
                          Enable
                        </button>
                      )}
                      {canEdit && mod !== "Disabled" && (
                        <button
                          type="button"
                          className="ad-btn ad-btn-ghost ad-btn-sm"
                          onClick={() =>
                            setPending({ action: LISTING_ACTIONS.disable, listing: p })
                          }
                        >
                          Disable
                        </button>
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
        <Pagination
          page={data.page}
          pageSize={pageSize}
          total={data.count}
          onPage={setPage}
          onPageSize={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      )}

      <ConfirmActionModal
        action={pending?.action}
        targets={pending ? [pending.listing.title] : []}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      />
    </section>
  );
}
