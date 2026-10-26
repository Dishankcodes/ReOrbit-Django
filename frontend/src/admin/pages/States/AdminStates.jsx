import React, { useState } from "react";
import { SearchX, Inbox, PackageX, Truck, CircleCheck, Bug } from "lucide-react";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import { PageSkeleton } from "../../components/ui/Skeleton";
import AdminNotFound from "./AdminNotFound";
import "../../css/AdminUI.css";
import "../../css/states/AdminStates.css";

/* A gallery of every loading, empty and error screen, for the team to review.
   Open it at /admin-states. It is not in the sidebar. */
const TABS = [
  { key: "loading", label: "Loading" },
  { key: "empty", label: "Empty" },
  { key: "error", label: "Errors" },
  { key: "404", label: "Page not found" },
];

function Crash() {
  const [boom, setBoom] = useState(false);
  if (boom) throw new Error("Demo crash: this is how a page error looks. Nothing is actually broken.");
  return <button type="button" className="ad-btn ad-btn-ghost" onClick={() => setBoom(true)}><Bug size={15} /> Make this page crash (demo)</button>;
}

export default function AdminStates() {
  const [tab, setTab] = useState("loading");
  const [variant, setVariant] = useState("list");
  return (
    <div className="au-page st-gallery">
      <div className="st-tabs" role="tablist" aria-label="State type">
        {TABS.map((t) => <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {tab === "loading" && (
        <section className="au-panel st-box">
          <header><h3>Loading skeletons</h3><p>Shown while a page opens. Each one copies the layout of the page it stands in for.</p></header>
          <div className="st-pills" role="group" aria-label="Skeleton type">
            {[["dashboard", "Dashboard"], ["list", "List with table"], ["detail", "Details page"], ["form", "Form or settings"], ["generic", "Anything else"]].map(([k, l]) => (
              <button key={k} type="button" className={variant === k ? "on" : ""} aria-pressed={variant === k} onClick={() => setVariant(k)}>{l}</button>
            ))}
          </div>
          <div className="st-frame"><PageSkeleton variant={variant} /></div>
        </section>
      )}

      {tab === "empty" && (
        <section className="au-panel st-box">
          <header><h3>Empty states</h3><p>The little picture follows the kind of emptiness, so “nothing found” and “all clear” feel different.</p></header>
          <div className="st-grid">
            <div className="st-cell"><EmptyState icon={SearchX} title="No results found" text="Try a different word or clear the filters." action={<button type="button" className="ad-btn ad-btn-ghost ad-btn-sm">Clear filters</button>} /></div>
            <div className="st-cell"><EmptyState icon={CircleCheck} title="All caught up" text="Nothing needs your attention right now." /></div>
            <div className="st-cell"><EmptyState icon={PackageX} title="Nothing here yet" text="Items will appear here once they are added." action={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm">Add the first one</button>} /></div>
            <div className="st-cell"><EmptyState icon={Truck} art="orbit" title="No pickups today" text="Enjoy the quiet. New requests will show up here." /></div>
            <div className="st-cell"><EmptyState icon={Inbox} compact title="No notifications" text="You are up to date." /></div>
          </div>
        </section>
      )}

      {tab === "error" && (
        <section className="au-panel st-box">
          <header><h3>Error states</h3><p>For a part of a page that could not load. A whole-page crash is shown by the error screen.</p></header>
          <div className="st-grid">
            <div className="st-cell"><ErrorState onRetry={() => {}} /></div>
            <div className="st-cell"><ErrorState kind="network" onRetry={() => {}} /></div>
            <div className="st-cell"><ErrorState kind="denied" /></div>
            <div className="st-cell"><ErrorState compact title="The chart could not load" text="Try again in a moment." onRetry={() => {}} /></div>
          </div>
          <div className="st-demo"><Crash /></div>
        </section>
      )}

      {tab === "404" && <section className="au-panel st-box"><AdminNotFound /></section>}
    </div>
  );
}
