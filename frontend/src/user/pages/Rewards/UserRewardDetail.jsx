import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Copy, Info, Lock, Star, Ticket } from "lucide-react";

import { LEVELS, getVoucher, redeemVoucher, useRewards } from "../../data/rewardsStore";
import { formatDate } from "../../utils/format";
import ConfirmModal from "../../components/ui/ConfirmModal";
import Crumbs from "../../components/ui/Crumbs";
import EmptyState from "../../components/ui/EmptyState";
import useToast from "../../components/ui/useToast";

import "../../css/shared/ui-base.css";
import "../../css/rewards/rewards-base.css";

export default function UserRewardDetail() {
  const { voucherId } = useParams();
  const voucher = getVoucher(voucherId);
  const { balance, levelIndex } = useRewards();
  const { toast, show } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  if (!voucher || voucher.kind !== "points") {
    return <div className="dn"><EmptyState icon={Ticket} title="Reward not found" text="It may have expired." actionLabel="Back to rewards" to="/user-orbit-points/vouchers" /></div>;
  }

  const locked = levelIndex < voucher.level;
  const out = voucher.left <= 0 || voucher.paused;
  const short = balance < voucher.cost;
  const can = !locked && !out && !short;

  const redeem = () => {
    const res = redeemVoucher(voucher.id, { balance, level: levelIndex });
    setConfirm(false);
    if (res.ok) setResult(res.entry); else setError(res.error);
  };
  const copy = async () => { try { await navigator.clipboard.writeText(result.code); show("Code copied."); } catch { show("Couldn't copy."); } };

  if (result) {
    return (
      <div className="dn rw">
        <Crumbs items={[{ label: "Orbit Points", to: "/user-orbit-points" }, { label: "Rewards", to: "/user-orbit-points/vouchers" }, { label: "Redeemed" }]} />
        <section className="dn-card rw-done">
          <span className="rw-done-ico"><CheckCircle2 size={44} /></span>
          <span className="dn-eyebrow">Reward redeemed</span>
          <h1>{voucher.title} is yours.</h1>
          <p>{voucher.cost} points were used. Enter this code at checkout.</p>
          <button type="button" className="rw-codebox" onClick={copy}><code>{result.code}</code><Copy size={16} /></button>
          <div className="rw-done-actions">
            <Link to="/user-marketplace" className="dn-btn">Start shopping</Link>
            <Link to="/user-orbit-points/vouchers" className="dn-btn dn-btn--ghost">My vouchers</Link>
          </div>
          <small>Valid till {formatDate(voucher.validTo)} · min order ₹{voucher.minOrder.toLocaleString("en-IN")}</small>
        </section>
        {toast}
      </div>
    );
  }

  return (
    <div className="dn rw">
      <Crumbs items={[{ label: "Orbit Points", to: "/user-orbit-points" }, { label: "Rewards", to: "/user-orbit-points/vouchers" }, { label: voucher.title }]} />

      <div className="rw-detail">
        <section className="dn-card rw-detail-main">
          <span className="rw-detail-ico"><Ticket size={34} /></span>
          <span className="dn-eyebrow">Reward</span>
          <h1>{voucher.title}</h1>
          <p>{voucher.description}</p>

          <h3>Terms</h3>
          <ul className="rw-terms">
            <li>Minimum order <b>₹{voucher.minOrder.toLocaleString("en-IN")}</b></li>
            <li>Maximum discount <b>₹{voucher.maxDiscount.toLocaleString("en-IN")}</b></li>
            <li>Valid till <b>{formatDate(voucher.validTo)}</b></li>
            <li>Works once, on one order</li>
            {voucher.level > 0 && <li>For <b>{LEVELS[voucher.level].name}</b> level and above</li>}
          </ul>
        </section>

        <aside className="dn-card dn-card-pad rw-detail-side">
          <div className="rw-cost"><Star size={22} fill="currentColor" /><strong>{voucher.cost.toLocaleString("en-IN")}</strong><span>points</span></div>
          <dl>
            <div><dt>Your balance</dt><dd>{balance.toLocaleString("en-IN")}</dd></div>
            <div><dt>After redeeming</dt><dd className={short ? "bad" : ""}>{(balance - voucher.cost).toLocaleString("en-IN")}</dd></div>
          </dl>

          {locked && <p className="rw-warn"><Lock size={14} /> Reach {LEVELS[voucher.level].name} level to unlock this.</p>}
          {out && <p className="rw-warn"><Info size={14} /> {voucher.paused ? "This reward is paused right now." : "This reward is fully claimed."}</p>}
          {short && !locked && !out && <p className="rw-warn"><Info size={14} /> You need {(voucher.cost - balance).toLocaleString("en-IN")} more points.</p>}
          {error && <p className="dn-error">{error}</p>}

          <button type="button" className="dn-btn dn-btn--block sp-big" disabled={!can} onClick={() => setConfirm(true)}>Redeem for {voucher.cost.toLocaleString("en-IN")} points</button>
          {!can && <Link to="/user-orbit-points/earn" className="dn-link rw-center">See ways to earn</Link>}
        </aside>
      </div>

      {confirm && (
        <ConfirmModal icon={Ticket} tone="primary" title="Redeem this reward?" confirmLabel="Redeem" cancelLabel="Not now" onClose={() => setConfirm(false)} onConfirm={redeem}>
          <p>{voucher.cost} points will be used for <b>{voucher.title}</b>. This can't be undone.</p>
        </ConfirmModal>
      )}
      {toast}
    </div>
  );
}
