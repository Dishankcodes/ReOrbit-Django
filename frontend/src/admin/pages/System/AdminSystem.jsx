/* =========================================================
   Admin › System  (Super Admins only)
   - Pause / start each side of ReOrbit: members + public shop, ReMakers, other admins.
     A paused side shows a "paused" screen and makes no calls to the server.
   - Usage: which pages and endpoints keep the server (Render) and the database (Neon) busy,
     from ReOrbit's own request log, plus Neon / Render's own numbers when their keys are set.
   ========================================================= */
import React, { useCallback, useEffect, useState } from "react";
import {
  Power,
  PauseCircle,
  PlayCircle,
  Users,
  Hammer,
  ShieldCheck,
  Database,
  Server,
  Globe,
  RefreshCw,
  Bot,
  Moon,
  Activity,
  AlertTriangle,
  X,
} from "lucide-react";

import { apiRequest } from "../../../api/api";
import { isActive, onActive } from "../../../shared/activity";
import { checkPause } from "../../../shared/pause";
import "../../css/system/AdminSystem.css";

const SIDES = [
  { key: "user", label: "Members & public shop", icon: Users,
    text: "Everyone on the member side, signed in or just browsing the shop." },
  { key: "remaker", label: "ReMakers", icon: Hammer, text: "The ReMaker studio and the ReMaker pages." },
  { key: "admin", label: "Other admins", icon: ShieldCheck,
    text: "Every admin except Super Admins. You keep full access." },
];
const SIDE_LABEL = { user: "Members", remaker: "ReMakers", admin: "Admins", guest: "Visitors", bot: "Bots & monitors" };
const RANGES = [1, 7, 30];

const n = (v) => Number(v || 0).toLocaleString("en-IN");
const secs = (ms) => {
  const s = Number(ms || 0) / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
  if (s < 3600) return `${(s / 60).toFixed(1)} min`;
  return `${(s / 3600).toFixed(1)} h`;
};
const when = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : "—";

function ConfirmPause({ ask, onClose, onYes, busy }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  const pausing = Object.values(ask.change).some(Boolean);
  return (
    <div className="sys-modal-back" onClick={onClose}>
      <div className="sys-modal" role="dialog" aria-modal="true" aria-labelledby="sys-modal-h" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sys-x" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        <span className={`sys-modal-icon ${pausing ? "warn" : "ok"}`}>
          {pausing ? <PauseCircle size={24} /> : <PlayCircle size={24} />}
        </span>
        <h3 id="sys-modal-h">{ask.title}</h3>
        <p>{ask.text}</p>
        <div className="sys-modal-actions">
          <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={`ad-btn ${pausing ? "ad-btn-danger" : "ad-btn-primary"}`} disabled={busy} onClick={onYes}>
            {busy ? "Saving…" : ask.yes}
          </button>
        </div>
      </div>
    </div>
  );
}

function Providers() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback((refresh = false) => {
    setBusy(true);
    apiRequest(`/adminops/admin/system/providers/${refresh ? "?refresh=1" : ""}`)
      .then((r) => setData(r.data))
      .catch(() => setData({ error: true }))
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => load(), [load]);

  const neon = data?.neon || {};
  const render = data?.render || {};
  return (
    <section className="sys-panel">
      <header className="sys-panel-head">
        <div>
          <h3>Neon, Render and Vercel</h3>
          <p>Numbers from the providers themselves. Asking them doesn’t wake the server or the database.</p>
        </div>
        <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => load(true)} disabled={busy}>
          <RefreshCw size={14} className={busy ? "sys-spin" : ""} /> Refresh
        </button>
      </header>
      <div className="sys-prov">
        <article className="sys-prov-card">
          <h4><Database size={16} /> Neon database</h4>
          {!data ? <p className="sys-muted">Loading…</p> : neon.error ? (
            <p className="sys-err"><AlertTriangle size={14} /> {neon.error}</p>
          ) : !neon.configured ? (
            <p className="sys-muted">Add <code>NEON_API_KEY</code> and <code>NEON_PROJECT_ID</code> to the server’s environment on Render to see compute hours here.</p>
          ) : (
            <>
              <dl className="sys-dl">
                <div><dt>Compute hours (this period)</dt><dd>{neon.computeHours}</dd></div>
                <div><dt>Active hours</dt><dd>{neon.activeHours}</dd></div>
                <div><dt>Data sent</dt><dd>{neon.dataTransferMb} MB</dd></div>
                <div><dt>Storage</dt><dd>{neon.storageMb} MB</dd></div>
                <div><dt>Last active</dt><dd>{when(neon.lastActive)}</dd></div>
              </dl>
              {(neon.computes || []).map((c) => (
                <p key={c.id} className="sys-chip-line">
                  <span className={`sys-chip ${c.state === "idle" ? "ok" : "busy"}`}>{c.state === "idle" ? "Sleeping" : c.state || "?"}</span>
                  {c.type === "read_write" ? "Main compute" : c.type} · sleeps after {c.sleepsAfterSeconds ? `${Math.round(c.sleepsAfterSeconds / 60)} min` : "5 min (default)"} idle
                </p>
              ))}
              {neon.periodStart && <p className="sys-muted">Period {when(neon.periodStart)} – {when(neon.periodEnd)}</p>}
            </>
          )}
        </article>
        <article className="sys-prov-card">
          <h4><Server size={16} /> Render server</h4>
          {!data ? <p className="sys-muted">Loading…</p> : render.error ? (
            <p className="sys-err"><AlertTriangle size={14} /> {render.error}</p>
          ) : !render.configured ? (
            <p className="sys-muted">Add <code>RENDER_API_KEY</code> and <code>RENDER_SERVICE_ID</code> to the server’s environment to see when the server was awake.</p>
          ) : (
            <dl className="sys-dl">
              <div><dt>Service</dt><dd>{render.name || render.service}</dd></div>
              <div><dt>Plan</dt><dd>{render.plan || "—"}</dd></div>
              <div><dt>Awake (last 24 h)</dt><dd>{render.awakeHours ?? "—"} h</dd></div>
              <div><dt>HTTP requests (last 24 h)</dt><dd>{render.httpRequests != null ? n(render.httpRequests) : "—"}</dd></div>
              {render.instanceError && <div><dt>Instances</dt><dd className="sys-err">not available</dd></div>}
            </dl>
          )}
        </article>
        <article className="sys-prov-card">
          <h4><Globe size={16} /> Vercel website</h4>
          <p className="sys-muted">
            Vercel only serves the built website files: no ReOrbit code runs there, so an open tab costs Vercel
            nothing after the page has loaded. Bandwidth is on the Vercel dashboard (Usage).
          </p>
        </article>
      </div>
    </section>
  );
}

export default function AdminSystem() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [ask, setAsk] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    apiRequest(`/adminops/admin/system/?days=${days}`)
      .then((r) => {
        setData(r.data);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load the system page."));
  }, [days]);

  useEffect(() => {
    load();
    const t = setInterval(() => isActive() && load(), 60000);
    const off = onActive(load);
    return () => {
      clearInterval(t);
      off();
    };
  }, [load]);

  const paused = data?.paused || { user: false, remaker: false, admin: false };
  const allPaused = SIDES.every((s) => paused[s.key]);

  const askFor = (change) => {
    const keys = Object.keys(change);
    const pausing = Object.values(change).some(Boolean);
    const names = keys.map((k) => SIDES.find((s) => s.key === k).label.toLowerCase()).join(", ");
    setAsk({
      change,
      yes: pausing ? "Pause" : "Start",
      title: keys.length === 3 ? (pausing ? "Pause everything?" : "Start everything again?") : `${pausing ? "Pause" : "Start"} ${names}?`,
      text: pausing
        ? "People on these sides see a “paused” screen straight away and can’t use ReOrbit until you start it again. Their apps stop calling the server, so nothing runs on Render or Neon for them. Payments already made are still recorded."
        : "Everyone on these sides can use ReOrbit again. Open tabs notice within a few minutes, or straight away when they press “Check again”.",
    });
  };

  const save = () => {
    setBusy(true);
    apiRequest("/adminops/admin/system/pause/", { method: "POST", body: ask.change })
      .then((r) => {
        setToast(r.message || "Saved.");
        setAsk(null);
        load();
        checkPause();
      })
      .catch((e) => setToast(e.message || "Could not save."))
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const u = data?.usage;
  const maxDay = Math.max(1, ...(u?.daily || []).map((d) => d.queries));
  const sideTotal = Math.max(1, ...(u?.sides || []).map((s) => s.queries));

  return (
    <div className="sys-page">
      <section className="sys-hero">
        <div>
          <span className="sys-eyebrow"><Power size={14} /> SYSTEM · SUPER ADMIN</span>
          <h2>Pause switches and usage</h2>
          <p>
            Turn a side of ReOrbit off and on, and see what keeps the server and the database awake. Tabs left open
            and untouched stop calling the server after 5 minutes, so with nobody around Render can sleep and Neon can
            scale to zero.
          </p>
        </div>
        <button
          type="button"
          className={`sys-big ${allPaused ? "start" : "stop"}`}
          onClick={() => askFor({ user: !allPaused, remaker: !allPaused, admin: !allPaused })}
          disabled={!data}
        >
          {allPaused ? <PlayCircle size={20} /> : <PauseCircle size={20} />}
          {allPaused ? "Start everything" : "Pause everything"}
        </button>
      </section>

      {error && <p className="sys-err sys-banner"><AlertTriangle size={15} /> {error}</p>}

      <section className="sys-panel">
        <header className="sys-panel-head">
          <div>
            <h3>Pause switches</h3>
            <p>
              {data?.changedAt
                ? `Last changed ${when(data.changedAt)} by ${data.changedBy || "a Super Admin"}.`
                : "Nothing has been paused yet."}
            </p>
          </div>
        </header>
        <div className="sys-switches">
          {SIDES.map((s) => {
            const Icon = s.icon;
            const on = paused[s.key];
            return (
              <article key={s.key} className={`sys-switch ${on ? "is-paused" : ""}`}>
                <span className="sys-switch-icon"><Icon size={19} /></span>
                <div className="sys-switch-body">
                  <strong>{s.label}</strong>
                  <small>{s.text}</small>
                </div>
                <span className={`sys-chip ${on ? "bad" : "ok"}`}>{on ? "Paused" : "Running"}</span>
                <button
                  type="button"
                  className={`ad-btn ad-btn-sm ${on ? "ad-btn-primary" : "ad-btn-ghost"}`}
                  onClick={() => askFor({ [s.key]: !on })}
                  disabled={!data}
                >
                  {on ? <PlayCircle size={14} /> : <PauseCircle size={14} />} {on ? "Start" : "Pause"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="sys-panel">
        <header className="sys-panel-head">
          <div>
            <h3>Where the work goes</h3>
            <p>
              ReOrbit’s own log of API calls: how many each part made, how many database queries they ran and how long
              they took. Saved every {u?.flushMinutes || 10} minutes while there is traffic.
            </p>
          </div>
          <div className="sys-range" role="group" aria-label="Period">
            {RANGES.map((d) => (
              <button key={d} type="button" className={d === days ? "on" : ""} aria-pressed={d === days} onClick={() => setDays(d)}>
                {d === 1 ? "24 h" : `${d} days`}
              </button>
            ))}
          </div>
        </header>

        {!u ? (
          <p className="sys-muted sys-pad">Loading…</p>
        ) : (
          <>
            <div className="sys-kpis">
              <div><Activity size={17} /><span>API calls</span><strong>{n(u.totals.requests)}</strong></div>
              <div><Database size={17} /><span>Database queries</span><strong>{n(u.totals.queries)}</strong></div>
              <div><Database size={17} /><span>Time in the database</span><strong>{secs(u.totals.db_ms)}</strong></div>
              <div><Server size={17} /><span>Server busy</span><strong>{secs(u.totals.app_ms)}</strong></div>
              <div><Moon size={17} /><span>Hours with any traffic</span><strong>{n(u.totals.awakeHours)} of {u.days * 24}</strong></div>
            </div>

            <div className="sys-grid">
              <div className="sys-block">
                <h4>By side</h4>
                {u.sides.length === 0 && <p className="sys-muted">No calls in this period.</p>}
                {u.sides.map((s) => (
                  <div key={s.side} className="sys-bar-row">
                    <span>{SIDE_LABEL[s.side] || s.side}</span>
                    <div className="sys-bar"><i style={{ width: `${(s.queries / sideTotal) * 100}%` }} /></div>
                    <small>{n(s.requests)} calls · {n(s.queries)} queries</small>
                  </div>
                ))}
              </div>
              <div className="sys-block">
                <h4>By day</h4>
                {u.daily.length === 0 && <p className="sys-muted">No calls in this period.</p>}
                <div className="sys-days">
                  {u.daily.map((d) => (
                    <div key={d.day} className="sys-day" title={`${d.day}: ${n(d.requests)} calls, ${n(d.queries)} queries, ${d.awakeHours} h with traffic`}>
                      <i style={{ height: `${Math.max(4, (d.queries / maxDay) * 100)}%` }} />
                      <small>{new Date(d.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sys-table-wrap">
              <table className="sys-table">
                <caption>Busiest endpoints (by time in the database)</caption>
                <thead>
                  <tr>
                    <th scope="col">Endpoint</th>
                    <th scope="col">Calls</th>
                    <th scope="col">Queries</th>
                    <th scope="col">Per call</th>
                    <th scope="col">DB time</th>
                    <th scope="col">Avg time</th>
                    <th scope="col">Who</th>
                  </tr>
                </thead>
                <tbody>
                  {u.routes.length === 0 && (
                    <tr><td colSpan={7} className="sys-muted">No calls in this period.</td></tr>
                  )}
                  {u.routes.map((r) => (
                    <tr key={`${r.method}${r.route}`}>
                      <td><code>{r.method} {r.route}</code>{r.slow > 0 && <span className="sys-chip warn">{r.slow} slow</span>}</td>
                      <td>{n(r.requests)}</td>
                      <td>{n(r.queries)}</td>
                      <td className={r.queriesPerRequest > 20 ? "sys-hot" : ""}>{r.queriesPerRequest}</td>
                      <td>{secs(r.dbMs)}</td>
                      <td>{r.msPerRequest} ms</td>
                      <td className="sys-who">
                        {Object.entries(r.sides || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${SIDE_LABEL[k] || k} ${n(v)}`).join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {u.bots.length > 0 && (
              <div className="sys-block sys-bots">
                <h4><Bot size={15} /> Bots, monitors and scripts</h4>
                <p className="sys-muted">
                  Callers that aren’t a browser. An uptime monitor that pings the API keeps the server and the database
                  awake all day: remove it if you don’t need it.
                </p>
                <ul>
                  {u.bots.map((b) => (
                    <li key={b.agent}><code>{b.agent || "(unknown)"}</code><span>{n(b.requests)} calls · {n(b.queries)} queries</span></li>
                  ))}
                </ul>
              </div>
            )}
            <p className="sys-muted sys-pad">Last call logged: {when(u.lastRequestHour)} (hour).</p>
          </>
        )}
      </section>

      <Providers />

      {ask && <ConfirmPause ask={ask} busy={busy} onClose={() => setAsk(null)} onYes={save} />}
      {toast && <div className="sys-toast" role="status">{toast}</div>}
    </div>
  );
}
