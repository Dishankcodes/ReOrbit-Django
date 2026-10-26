import React, { useMemo, useState } from "react";
import { Search, X, ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";

import { useRewards } from "../../data/rewardsStore";
import EmptyState from "../../components/ui/EmptyState";
import PointsNav from "./components/PointsNav";
import LedgerRow from "./components/LedgerRow";

import "../../css/shared/ui-base.css";
import "../../css/rewards/rewards-base.css";

const KINDS = [["all", "All"], ["purchase", "Buying"], ["donation", "Donating"], ["listing", "Selling"], ["review", "Reviews"], ["follow", "Following"], ["spend", "Redeemed"]];
const month = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });

export default function UserPointsHistory() {
  const { ledger, lifetime, balance } = useRewards();
  const [kind, setKind] = useState("all");
  const [flow, setFlow] = useState("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const t = query.trim().toLowerCase();
    return ledger
      .filter((e) => kind === "all" || e.kind === kind)
      .filter((e) => (flow === "all" ? true : flow === "in" ? e.points > 0 : e.points < 0))
      .filter((e) => (t ? `${e.title} ${e.detail}`.toLowerCase().includes(t) : true));
  }, [ledger, kind, flow, query]);

  const groups = useMemo(() => {
    const map = new Map();
    rows.forEach((e) => {
      const key = month.format(new Date(e.at));
      map.set(key, [...(map.get(key) || []), e]);
    });
    return [...map.entries()];
  }, [rows]);

  const earned = rows.filter((e) => e.points > 0).reduce((n, e) => n + e.points, 0);
  const spent = rows.filter((e) => e.points < 0).reduce((n, e) => n + Math.abs(e.points), 0);

  return (
    <div className="dn rw">
      <PointsNav />
      <header className="rw-head">
        <div>
          <span className="dn-eyebrow">Orbit Points</span>
          <h1>Points history</h1>
          <p className="dn-muted">Every point you've earned or spent. Balance {balance.toLocaleString("en-IN")} · lifetime {lifetime.toLocaleString("en-IN")}.</p>
        </div>
      </header>

      <section className="rw-sum">
        <div><ArrowDownLeft size={18} /><strong>+{earned.toLocaleString("en-IN")}</strong><small>Earned (in this view)</small></div>
        <div className="out"><ArrowUpRight size={18} /><strong>−{spent.toLocaleString("en-IN")}</strong><small>Spent (in this view)</small></div>
      </section>

      <section className="dn-card rw-tools">
        <div className="rw-chips" role="tablist">
          {KINDS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={kind === id} className={kind === id ? "on" : ""} onClick={() => setKind(id)}>{label}</button>)}
        </div>
        <div className="rw-filters">
          <label className="rw-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search activity" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear"><X size={14} /></button>}</label>
          <select className="dn-select" value={flow} onChange={(e) => setFlow(e.target.value)} aria-label="Earned or spent">
            <option value="all">Earned and spent</option><option value="in">Earned only</option><option value="out">Spent only</option>
          </select>
        </div>
      </section>

      {rows.length === 0 ? (
        <EmptyState icon={Receipt} title="No activity here" text="Nothing matches these filters yet." actionLabel="Show everything" onAction={() => { setKind("all"); setFlow("all"); setQuery(""); }} />
      ) : (
        groups.map(([m, entries]) => (
          <section key={m} className="rw-group">
            <h3>{m}</h3>
            <div className="dn-card rw-rows rw-rows-card">{entries.map((e) => <LedgerRow key={e.id} entry={e} />)}</div>
          </section>
        ))
      )}
    </div>
  );
}
