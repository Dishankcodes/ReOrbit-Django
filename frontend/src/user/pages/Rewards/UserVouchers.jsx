import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Ticket, TicketPercent, CheckCircle2 } from "lucide-react";

import { useRewards } from "../../data/rewardsStore";
import { useVouchers } from "../../data/donationsStore";
import { useVoucherList } from "../../../shared/rewardRules";
import { formatDate } from "../../utils/format";
import EmptyState from "../../components/ui/EmptyState";
import useToast from "../../components/ui/useToast";
import PointsNav from "./components/PointsNav";
import { RewardCard } from "./components/VoucherCard";

import "../../css/shared/ui-base.css";
import "../../css/rewards/rewards-base.css";

export default function UserVouchers() {
  const { balance, levelIndex, redeemed } = useRewards();
  const vouchers = useVoucherList();
  const donated = useVouchers();
  const [tab, setTab] = useState("donation");
  const { toast, show } = useToast();

  const store = vouchers.filter((v) => v.kind === "points");
  const codes = vouchers.filter(
    (v) => v.kind === "code" && new Date(v.validTo) > new Date(),
  );
  const mine = redeemed;
  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      show("Code copied.");
    } catch {
      show("Couldn't copy. Select the code and copy it.");
    }
  };

  const tabs = [
    ["donation", "From donations", donated.vouchers.length],
    ["store", "Rewards store", store.length],
    ["mine", "My vouchers", mine.length],
    ["codes", "Coupon codes", codes.length],
  ];

  return (
    <div className="dn rw">
      <PointsNav />
      <header className="urw-head">
        <div>
          <span className="dn-eyebrow">Orbit Points</span>
          <h1>Rewards &amp; vouchers</h1>
          <p className="dn-muted">
            You have <b>{balance.toLocaleString("en-IN")}</b> points to spend.
          </p>
        </div>
        <Link to="/user-orbit-points/earn" className="dn-btn dn-btn--ghost">
          Earn more
        </Link>
      </header>

      <div className="urw-chips solo" role="tablist">
        {tabs.map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "on" : ""}
            onClick={() => setTab(id)}
          >
            {label} <em>{n}</em>
          </button>
        ))}
      </div>

      {tab === "donation" &&
        (donated.vouchers.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No donation vouchers yet"
            text="Donate an item. When it reaches our warehouse you get a voucher to use in the marketplace."
            actionLabel="Donate an item"
            to="/user-donations/new"
          />
        ) : (
          <div className="urw-mine">
            {donated.vouchers.map((v) => (
              <article
                key={v.id}
                className={`dn-card urw-mine-card ${v.status !== "Active" ? "is-used" : ""}`}
              >
                <span className="urw-mine-ico">
                  <Ticket size={22} />
                </span>
                <div>
                  <h3>{v.title}</h3>
                  <small>
                    Earned from {v.source.id} · cart of ₹
                    {v.min_order.toLocaleString("en-IN")} or more ·{" "}
                    {v.status === "Active"
                      ? `valid till ${formatDate(v.expires_at)}`
                      : v.status === "Used"
                        ? `used ${formatDate(v.used_at)}`
                        : "expired"}
                  </small>
                </div>
                <code>{v.code}</code>
                {v.status !== "Active" ? (
                  <span className="dn-badge dn-badge--grey">{v.status}</span>
                ) : (
                  <div className="urw-mine-actions">
                    <button
                      type="button"
                      className="dn-btn dn-btn--soft dn-btn--sm"
                      onClick={() => copy(v.code)}
                    >
                      <Copy size={13} /> Copy
                    </button>
                    <Link to="/user-marketplace" className="dn-btn dn-btn--sm">
                      Shop now
                    </Link>
                  </div>
                )}
              </article>
            ))}
          </div>
        ))}

      {tab === "store" && (
        <div className="urw-vouchers">
          {store.map((v) => (
            <RewardCard
              key={v.id}
              voucher={v}
              balance={balance}
              levelIndex={levelIndex}
            />
          ))}
        </div>
      )}

      {tab === "mine" &&
        (mine.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No vouchers yet"
            text="Redeem a reward with your Orbit Points and its code will appear here."
            actionLabel="Open rewards store"
            onAction={() => setTab("store")}
          />
        ) : (
          <div className="urw-mine">
            {mine.map((r) => (
              <article
                key={r.rid}
                className={`dn-card urw-mine-card ${r.used ? "is-used" : ""}`}
              >
                <span className="urw-mine-ico">
                  <Ticket size={22} />
                </span>
                <div>
                  <h3>{r.title}</h3>
                  <small>
                    Redeemed {formatDate(r.at)} · {r.cost} points
                  </small>
                </div>
                <code>{r.code}</code>
                {r.used ? (
                  <span className="dn-badge dn-badge--grey">Used</span>
                ) : (
                  <div className="urw-mine-actions">
                    <button
                      type="button"
                      className="dn-btn dn-btn--soft dn-btn--sm"
                      onClick={() => copy(r.code)}
                    >
                      <Copy size={13} /> Copy
                    </button>
                    <Link to="/user-marketplace" className="dn-btn dn-btn--sm">
                      Shop now
                    </Link>
                  </div>
                )}
              </article>
            ))}
          </div>
        ))}

      {tab === "codes" && (
        <div className="urw-codes">
          {codes.map((v) => (
            <article key={v.id} className="dn-card urw-code">
              <span>
                <TicketPercent size={20} />
              </span>
              <div>
                <h3>{v.title}</h3>
                <p>{v.description}</p>
                <small>
                  Min order ₹{v.minOrder.toLocaleString("en-IN")} · valid till{" "}
                  {formatDate(v.validTo)}
                </small>
              </div>
              <button
                type="button"
                className="urw-code-btn"
                onClick={() => copy(v.code)}
              >
                <code>{v.code}</code>
                <Copy size={14} />
              </button>
            </article>
          ))}
          <p className="dn-hint">
            <CheckCircle2 size={13} /> Enter a code in the coupon box at
            checkout. Some codes are for new users or donors only.
          </p>
        </div>
      )}
      {toast}
    </div>
  );
}
