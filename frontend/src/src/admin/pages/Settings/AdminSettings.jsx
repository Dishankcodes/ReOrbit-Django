import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  User,
  ShieldCheck,
  Receipt,
  Warehouse,
  Gift,
  Bell,
  Settings2,
  Save,
  RotateCcw,
  Monitor,
  Smartphone,
  LogOut,
  Info,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  useSettings,
  saveSection,
  setSecurity,
  revokeSession,
  DEFAULTS,
} from "../../data/settingsStore";
import { useStock } from "../../data/warehouseStore";
import { useRules, saveRule } from "../../data/rewardsStore";
import { formatINR, timeAgo, getInitials } from "../../utils/format";
import useToast from "../../components/ui/useToast";
import { useAccess } from "../../data/teamStore";

import "../../css/AdminUI.css";
import "../../css/settings/AdminSettings.css";

const SECTIONS = [
  {
    key: "profile",
    label: "My profile",
    hint: "Name, contact and photo",
    icon: User,
  },
  {
    key: "security",
    label: "Security",
    hint: "Password, 2-step, sessions",
    icon: ShieldCheck,
  },
  {
    key: "commerce",
    label: "Fees & delivery",
    hint: "Platform fee, shipping rules",
    icon: Receipt,
  },
  {
    key: "warehouse",
    label: "Warehouse rules",
    hint: "Unsold alerts and price cuts",
    icon: Warehouse,
  },
  {
    key: "rewards",
    label: "Reward points",
    hint: "What members earn",
    icon: Gift,
  },
  {
    key: "notifications",
    label: "Notifications",
    hint: "What reaches you and how",
    icon: Bell,
  },
  {
    key: "platform",
    label: "Platform",
    hint: "Maintenance and limits",
    icon: Settings2,
  },
];

/* ---------- small building blocks ---------- */
function Field({ label, hint, error, suffix, prefix, children }) {
  return (
    <label className={`st-field ${error ? "bad" : ""}`}>
      <span className="st-label">{label}</span>
      <span className="st-input">
        {prefix && <i>{prefix}</i>}
        {children}
        {suffix && <i>{suffix}</i>}
      </span>
      {error ? (
        <small className="st-err">{error}</small>
      ) : hint ? (
        <small>{hint}</small>
      ) : null}
    </label>
  );
}
function Switch({ on, onChange, label, desc }) {
  return (
    <div className="st-switch-row">
      <div>
        <strong>{label}</strong>
        {desc && <p>{desc}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`st-switch ${on ? "on" : ""}`}
        onClick={() => onChange(!on)}
      >
        <i />
      </button>
    </div>
  );
}
function Card({ title, sub, children, aside }) {
  return (
    <section className="st-card">
      <header>
        <div>
          <h3>{title}</h3>
          {sub && <p>{sub}</p>}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}
function SaveBar({ dirty, onSave, onDiscard, onReset, disabled }) {
  return (
    <div
      className={`st-savebar ${dirty ? "show" : ""}`}
      role="region"
      aria-label="Unsaved changes"
    >
      <span>
        <Info size={15} />
        {dirty ? "You have unsaved changes." : "All changes saved."}
      </span>
      <div>
        {onReset && (
          <button
            type="button"
            className="ad-btn ad-btn-ghost ad-btn-sm"
            onClick={onReset}
          >
            <RotateCcw size={14} />
            Defaults
          </button>
        )}
        <button
          type="button"
          className="ad-btn ad-btn-ghost ad-btn-sm"
          onClick={onDiscard}
          disabled={!dirty}
        >
          Discard
        </button>
        <button
          type="button"
          className="ad-btn ad-btn-primary ad-btn-sm"
          onClick={onSave}
          disabled={!dirty || disabled}
        >
          <Save size={14} />
          Save changes
        </button>
      </div>
    </div>
  );
}
function useDraft(stored) {
  const [draft, setDraft] = useState(stored);
  useEffect(() => setDraft(stored), [stored]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(stored);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  return { draft, setDraft, set, dirty, discard: () => setDraft(stored) };
}
const N = (v) => (v === "" || v == null ? "" : Number(v));
const numIn = (set, k) => (e) =>
  set(k, e.target.value === "" ? "" : Number(e.target.value));

/* ---------- sections ---------- */
function ProfileSection({ s, toast }) {
  const d = useDraft(s.profile);
  const p = d.draft;
  const errors = {
    name: p.name.trim().length < 2 ? "Enter your full name." : "",
    email: /^\S+@\S+\.\S+$/.test(p.email) ? "" : "Enter a valid email address.",
    phone:
      p.phone.replace(/\D/g, "").length < 10
        ? "Enter a valid phone number."
        : "",
  };
  const bad = Object.values(errors).some(Boolean);
  return (
    <>
      <Card
        title="My profile"
        sub="Shown in the admin header and in the activity log."
      >
        <div className="st-profile-top">
          <span className="st-avatar">{getInitials(p.name)}</span>
          <div>
            <strong>{p.name || "—"}</strong>
            <p>{p.role}</p>
          </div>
          <button
            type="button"
            className="ad-btn ad-btn-ghost ad-btn-sm"
            onClick={() => toast("Photo upload is a demo — nothing is stored.")}
          >
            Change photo
          </button>
        </div>
        <div className="st-grid">
          <Field label="Full name" error={errors.name}>
            <input
              value={p.name}
              onChange={(e) => d.set("name", e.target.value)}
              aria-invalid={!!errors.name}
            />
          </Field>
          <Field label="Role">
            <input value={p.role} disabled />
          </Field>
          <Field label="Email" error={errors.email}>
            <input
              type="email"
              value={p.email}
              onChange={(e) => d.set("email", e.target.value)}
              aria-invalid={!!errors.email}
            />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <input
              value={p.phone}
              onChange={(e) => d.set("phone", e.target.value)}
              aria-invalid={!!errors.phone}
            />
          </Field>
          <div className="st-wide">
            <Field
              label="Short bio"
              hint="Optional. Only visible to other admins."
            >
              <textarea
                rows={3}
                value={p.bio}
                onChange={(e) => d.set("bio", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Card>
      <SaveBar
        dirty={d.dirty}
        disabled={bad}
        onDiscard={d.discard}
        onSave={() => {
          saveSection(
            "profile",
            { ...p, name: p.name.trim() },
            "Profile updated",
          );
          toast("Profile saved.");
        }}
      />
    </>
  );
}

function strength(pw) {
  let n = 0;
  if (pw.length >= 8) n++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) n++;
  if (/\d/.test(pw)) n++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) n++;
  return n;
}
function SecuritySection({ s, toast }) {
  const [f, setF] = useState({ cur: "", next: "", again: "" });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState({});
  const sc = strength(f.next);
  const submit = () => {
    const e = {};
    if (!f.cur) e.cur = "Enter your current password.";
    if (f.next.length < 8) e.next = "Use at least 8 characters.";
    else if (!/\d/.test(f.next)) e.next = "Add at least one number.";
    else if (f.next === f.cur)
      e.next = "Choose a password you haven’t used just now.";
    if (f.again !== f.next) e.again = "The two passwords don’t match.";
    setErr(e);
    if (Object.keys(e).length) return;
    setSecurity(
      { passwordChangedAt: new Date().toISOString() },
      "Password changed",
    );
    setF({ cur: "", next: "", again: "" });
    toast("Password updated. Other sessions stay signed in in this demo.");
  };
  return (
    <>
      <Card
        title="Change password"
        sub={
          s.security.passwordChangedAt
            ? `Last changed ${timeAgo(s.security.passwordChangedAt)}`
            : "Use a long, unique password."
        }
      >
        <div className="st-grid">
          <Field label="Current password" error={err.cur}>
            <input
              type={show ? "text" : "password"}
              value={f.cur}
              onChange={(e) => setF({ ...f, cur: e.target.value })}
              autoComplete="current-password"
              aria-invalid={!!err.cur}
            />
          </Field>
          <span />
          <Field
            label="New password"
            error={err.next}
            hint="8+ characters with a number."
          >
            <input
              type={show ? "text" : "password"}
              value={f.next}
              onChange={(e) => setF({ ...f, next: e.target.value })}
              autoComplete="new-password"
              aria-invalid={!!err.next}
            />
          </Field>
          <Field label="Confirm new password" error={err.again}>
            <input
              type={show ? "text" : "password"}
              value={f.again}
              onChange={(e) => setF({ ...f, again: e.target.value })}
              autoComplete="new-password"
              aria-invalid={!!err.again}
            />
          </Field>
        </div>
        {f.next && (
          <div
            className="st-meter"
            aria-label={`Password strength ${["too weak", "weak", "fair", "good", "strong"][sc]}`}
          >
            {[1, 2, 3, 4].map((i) => (
              <i key={i} className={sc >= i ? `on l${sc}` : ""} />
            ))}
            <span>{["Too weak", "Weak", "Fair", "Good", "Strong"][sc]}</span>
          </div>
        )}
        <div className="st-row-actions">
          <button
            type="button"
            className="ad-btn ad-btn-ghost ad-btn-sm"
            onClick={() => setShow(!show)}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
            {show ? "Hide" : "Show"} passwords
          </button>
          <button
            type="button"
            className="ad-btn ad-btn-primary ad-btn-sm"
            onClick={submit}
          >
            Update password
          </button>
        </div>
      </Card>
      <Card
        title="Two-step verification"
        sub="Ask for a code from your authenticator app when signing in."
      >
        <Switch
          on={s.security.twoFactor}
          label="Require a code at sign-in"
          desc={
            s.security.twoFactor
              ? "On — recommended for admins."
              : "Off — turn this on to protect refunds, blocks and fee changes."
          }
          onChange={(v) => {
            setSecurity(
              { twoFactor: v },
              v ? "Two-step verification on" : "Two-step verification off",
            );
            toast(
              v
                ? "Two-step verification turned on."
                : "Two-step verification turned off.",
            );
          }}
        />
      </Card>
      <Card
        title="Where you’re signed in"
        sub="Sign out any device you don’t recognise."
      >
        <ul className="st-sessions">
          {s.security.sessions.map((x) => (
            <li key={x.id}>
              <span className="st-sess-ico">
                {/iPhone|Android/.test(x.device) ? (
                  <Smartphone size={17} />
                ) : (
                  <Monitor size={17} />
                )}
              </span>
              <div>
                <strong>
                  {x.device}
                  {x.current && <em>This device</em>}
                </strong>
                <p>
                  {x.place} · {x.at}
                </p>
              </div>
              {!x.current && (
                <button
                  type="button"
                  className="ad-btn ad-btn-ghost ad-btn-sm"
                  onClick={() => {
                    revokeSession(x.id);
                    toast("Session signed out.");
                  }}
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function CommerceSection({ s, toast }) {
  const d = useDraft(s.commerce);
  const c = d.draft;
  const e = {};
  if (!(c.platformFeePct >= 0 && c.platformFeePct <= 30))
    e.platformFeePct = "Between 0 and 30%.";
  [
    "productDelivery",
    "freeDeliveryFrom",
    "itemDelivery",
    "sellDelivery",
    "sellFreeFrom",
    "codLimit",
  ].forEach((k) => {
    if (c[k] === "" || c[k] < 0) e[k] = "Enter 0 or more.";
  });
  const bad = Object.keys(e).length > 0;
  const demo = 1000;
  const fee = Math.round((demo * (Number(c.platformFeePct) || 0)) / 100);
  return (
    <>
      <Card
        title="Platform fee"
        sub="Taken from member-to-member and ReMaker orders. Orders the platform itself buys or sells carry no fee."
      >
        <div className="st-grid">
          <Field label="Fee on each order" error={e.platformFeePct} suffix="%">
            <input
              type="number"
              min="0"
              max="30"
              step="0.5"
              value={c.platformFeePct}
              onChange={numIn(d.set, "platformFeePct")}
              aria-invalid={!!e.platformFeePct}
            />
          </Field>
          <div className="st-preview">
            <small>Example</small>
            <strong>
              ₹{demo.toLocaleString("en-IN")} order → {formatINR(fee)} fee
            </strong>
            <p>Seller receives {formatINR(demo - fee)}.</p>
          </div>
        </div>
      </Card>
      <Card
        title="Delivery charges"
        sub="Used by checkout in Buy Products and by your own listings in Sell Products."
      >
        <div className="st-grid">
          <Field
            label="Platform products: shipping charge"
            error={e.productDelivery}
            prefix="₹"
          >
            <input
              type="number"
              min="0"
              value={c.productDelivery}
              onChange={numIn(d.set, "productDelivery")}
            />
          </Field>
          <Field
            label="…free when subtotal reaches"
            error={e.freeDeliveryFrom}
            prefix="₹"
          >
            <input
              type="number"
              min="0"
              value={c.freeDeliveryFrom}
              onChange={numIn(d.set, "freeDeliveryFrom")}
            />
          </Field>
          <Field
            label="Member items handled by platform"
            error={e.itemDelivery}
            prefix="₹"
            hint="Pickup + handling for items sent through the warehouse."
          >
            <input
              type="number"
              min="0"
              value={c.itemDelivery}
              onChange={numIn(d.set, "itemDelivery")}
            />
          </Field>
          <span />
          <Field
            label="Your own listings: shipping charge"
            error={e.sellDelivery}
            prefix="₹"
          >
            <input
              type="number"
              min="0"
              value={c.sellDelivery}
              onChange={numIn(d.set, "sellDelivery")}
            />
          </Field>
          <Field
            label="…free when subtotal reaches"
            error={e.sellFreeFrom}
            prefix="₹"
          >
            <input
              type="number"
              min="0"
              value={c.sellFreeFrom}
              onChange={numIn(d.set, "sellFreeFrom")}
            />
          </Field>
        </div>
      </Card>
      <Card title="Cash on delivery">
        <Switch
          on={c.codEnabled}
          label="Allow pay on delivery"
          desc="Buyers can choose to pay when the order arrives."
          onChange={(v) => d.set("codEnabled", v)}
        />
        {c.codEnabled && (
          <div className="st-grid">
            <Field label="Maximum COD order" error={e.codLimit} prefix="₹">
              <input
                type="number"
                min="0"
                value={c.codLimit}
                onChange={numIn(d.set, "codLimit")}
              />
            </Field>
          </div>
        )}
      </Card>
      <SaveBar
        dirty={d.dirty}
        disabled={bad}
        onDiscard={d.discard}
        onReset={() => d.setDraft({ ...DEFAULTS.commerce })}
        onSave={() => {
          saveSection(
            "commerce",
            { ...c, platformFeePct: N(c.platformFeePct) },
            "Fees & delivery updated",
          );
          toast(
            "Fees and delivery rules saved. New checkouts use them straight away.",
          );
        }}
      />
    </>
  );
}

function WarehouseSection({ s, toast }) {
  const d = useDraft(s.warehouse);
  const w = d.draft;
  const stock = useStock();
  const listed = stock.filter(
    (i) => i.sale_status === "Listed" && i.warehouse_status === "Stored",
  );
  const e = {};
  if (!(w.unsoldDays >= 1)) e.unsoldDays = "At least 1 day.";
  if (!(w.slowDays > w.unsoldDays))
    e.slowDays = "Must be more than the alert day.";
  if (!(w.deadDays > w.slowDays))
    e.deadDays = "Must be more than the slow day.";
  if (!(w.priceCutPct >= 1 && w.priceCutPct <= 60))
    e.priceCutPct = "Between 1 and 60%.";
  const bad = Object.keys(e).length > 0;
  const hit = (n) => listed.filter((i) => i.daysListed >= n).length;
  const max = Math.max(Number(w.deadDays) || 30, 30) * 1.15;
  const pos = (n) => `${Math.min(100, ((Number(n) || 0) / max) * 100)}%`;
  return (
    <>
      <Card
        title="Unsold stock alerts"
        sub="Products listed for sale this long without selling raise an alert in Warehouse and Notifications."
      >
        <div className="st-grid three">
          <Field
            label="Start alerting after"
            error={e.unsoldDays}
            suffix="days"
          >
            <input
              type="number"
              min="1"
              value={w.unsoldDays}
              onChange={numIn(d.set, "unsoldDays")}
            />
          </Field>
          <Field label="Mark as slow moving" error={e.slowDays} suffix="days">
            <input
              type="number"
              min="1"
              value={w.slowDays}
              onChange={numIn(d.set, "slowDays")}
            />
          </Field>
          <Field label="Mark as dead stock" error={e.deadDays} suffix="days">
            <input
              type="number"
              min="1"
              value={w.deadDays}
              onChange={numIn(d.set, "deadDays")}
            />
          </Field>
        </div>
        <div className="st-timeline" aria-hidden="true">
          <div className="bar">
            <i
              className="watch"
              style={{
                left: pos(w.unsoldDays),
                width: `calc(${pos(w.slowDays)} - ${pos(w.unsoldDays)})`,
              }}
            />
            <i
              className="slow"
              style={{
                left: pos(w.slowDays),
                width: `calc(${pos(w.deadDays)} - ${pos(w.slowDays)})`,
              }}
            />
            <i className="dead" style={{ left: pos(w.deadDays), right: 0 }} />
          </div>
          <div className="ticks">
            <span style={{ left: pos(w.unsoldDays) }}>
              Watch · {w.unsoldDays}d
            </span>
            <span style={{ left: pos(w.slowDays) }}>Slow · {w.slowDays}d</span>
            <span style={{ left: pos(w.deadDays) }}>Dead · {w.deadDays}d</span>
          </div>
        </div>
        <p className="st-note">
          <AlertTriangle size={15} />
          <span>
            With these rules <b>{hit(Number(w.unsoldDays) || 0)}</b> of{" "}
            {listed.length} listed products would raise an alert today (
            {hit(Number(w.slowDays) || 0)} slow, {hit(Number(w.deadDays) || 0)}{" "}
            dead).
          </span>
        </p>
      </Card>
      <Card title="Price cuts">
        <Switch
          on={w.autoPriceCut}
          label="Suggest a price cut on dead stock"
          desc="Adds a one-click “cut price” suggestion to dead-stock alerts."
          onChange={(v) => d.set("autoPriceCut", v)}
        />
        <div className="st-grid">
          <Field label="Cut by" error={e.priceCutPct} suffix="%">
            <input
              type="number"
              min="1"
              max="60"
              value={w.priceCutPct}
              onChange={numIn(d.set, "priceCutPct")}
            />
          </Field>
        </div>
      </Card>
      <SaveBar
        dirty={d.dirty}
        disabled={bad}
        onDiscard={d.discard}
        onReset={() => d.setDraft({ ...DEFAULTS.warehouse })}
        onSave={() => {
          saveSection("warehouse", { ...w }, "Warehouse rules updated");
          toast("Warehouse rules saved. Alerts have been recalculated.");
        }}
      />
    </>
  );
}

function RewardsSection({ toast }) {
  const rules = useRules();
  return (
    <Card
      title="Reward points"
      sub="The same rules as Rewards › Earning rules. Changes apply instantly."
      aside={
        <Link
          className="ad-btn ad-btn-ghost ad-btn-sm"
          to="/admin-rewards?tab=rules"
        >
          Open Rewards
          <ArrowRight size={14} />
        </Link>
      }
    >
      <ul className="st-rules">
        {rules.map((r) => (
          <li key={r.id} className={r.active ? "" : "off"}>
            <div>
              <strong>{r.title}</strong>
              <p>
                {r.group} · {r.unit}
              </p>
            </div>
            <input
              type="number"
              min="0"
              value={r.points}
              disabled={!r.active}
              aria-label={`Points for ${r.title}`}
              onChange={(e) =>
                saveRule(r.id, {
                  points: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
            <button
              type="button"
              role="switch"
              aria-checked={r.active}
              aria-label={`${r.title} ${r.active ? "on" : "off"}`}
              className={`st-switch ${r.active ? "on" : ""}`}
              onClick={() => {
                saveRule(r.id, { active: !r.active });
                toast(`“${r.title}” turned ${r.active ? "off" : "on"}.`);
              }}
            >
              <i />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NotificationsSection({ s, toast }) {
  const d = useDraft(s.notifications);
  const n = d.draft;
  const setCh = (k, v) =>
    d.setDraft({ ...n, channels: { ...n.channels, [k]: v } });
  const setMod = (k, v) =>
    d.setDraft({ ...n, modules: { ...n.modules, [k]: v } });
  return (
    <>
      <Card title="How you’re notified">
        <Switch
          on={n.channels.email}
          label="Email alerts"
          desc="Critical alerts go to your email address."
          onChange={(v) => setCh("email", v)}
        />
        <Switch
          on={n.channels.push}
          label="In-app and push"
          desc="The bell in the header and browser notifications."
          onChange={(v) => setCh("push", v)}
        />
        <Switch
          on={n.channels.digest}
          label="Daily summary"
          desc="One email at 8 AM instead of many small ones."
          onChange={(v) => setCh("digest", v)}
        />
        <Switch
          on={n.quietHours}
          label="Quiet hours (10 PM – 7 AM)"
          desc="Only critical alerts break through."
          onChange={(v) => d.set("quietHours", v)}
        />
      </Card>
      <Card
        title="What you hear about"
        sub="Turn off modules you don’t manage."
      >
        <div className="st-chips">
          {Object.keys(n.modules).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={n.modules[k]}
              className={n.modules[k] ? "on" : ""}
              onClick={() => setMod(k, !n.modules[k])}
            >
              {n.modules[k] && <CheckCircle2 size={14} />}
              {k}
            </button>
          ))}
        </div>
      </Card>
      <SaveBar
        dirty={d.dirty}
        onDiscard={d.discard}
        onSave={() => {
          saveSection("notifications", n, "Notification preferences updated");
          toast("Notification preferences saved.");
        }}
      />
    </>
  );
}

function PlatformSection({ s, toast }) {
  const d = useDraft(s.platform);
  const p = d.draft;
  const e = {};
  if (!/^\S+@\S+\.\S+$/.test(p.supportEmail))
    e.supportEmail = "Enter a valid email address.";
  if (!(p.minDonationItems >= 1)) e.minDonationItems = "At least 1.";
  if (!(p.sessionMinutes >= 5)) e.sessionMinutes = "At least 5 minutes.";
  return (
    <>
      <Card
        title="Maintenance mode"
        sub="Shows a “be right back” page to users and ReMakers. Admins can still sign in."
      >
        <Switch
          on={p.maintenance}
          label="Put the marketplace in maintenance"
          desc={
            p.maintenance
              ? "Members currently can’t place orders or donations."
              : "Off — the marketplace is live."
          }
          onChange={(v) => d.set("maintenance", v)}
        />
        {p.maintenance && (
          <p className="st-note warn">
            <AlertTriangle size={15} />
            <span>
              Turn this on only for short windows. Announce it first from
              Notifications.
            </span>
          </p>
        )}
      </Card>
      <Card title="Limits & contact">
        <div className="st-grid">
          <Field label="Support email" error={e.supportEmail}>
            <input
              type="email"
              value={p.supportEmail}
              onChange={(ev) => d.set("supportEmail", ev.target.value)}
            />
          </Field>
          <Field label="Minimum items per donation" error={e.minDonationItems}>
            <input
              type="number"
              min="1"
              value={p.minDonationItems}
              onChange={numIn(d.set, "minDonationItems")}
            />
          </Field>
          <Field
            label="Admin session timeout"
            error={e.sessionMinutes}
            suffix="min"
          >
            <input
              type="number"
              min="5"
              value={p.sessionMinutes}
              onChange={numIn(d.set, "sessionMinutes")}
            />
          </Field>
        </div>
      </Card>
      <Card
        title="Recent setting changes"
        sub="Latest changes made in this session."
      >
        <ActivityLog />
      </Card>
      <SaveBar
        dirty={d.dirty}
        disabled={Object.keys(e).length > 0}
        onDiscard={d.discard}
        onSave={() => {
          saveSection(
            "platform",
            p,
            p.maintenance
              ? "Maintenance mode turned on"
              : "Platform settings updated",
          );
          toast("Platform settings saved.");
        }}
      />
    </>
  );
}
function ActivityLog() {
  const { log } = useSettings();
  if (!log.length)
    return (
      <p className="st-empty">
        No changes yet. Anything you save will be listed here.
      </p>
    );
  return (
    <ul className="st-log">
      {log.map((l, i) => (
        <li key={i}>
          <span>{l.what}</span>
          <small>{timeAgo(l.at)}</small>
        </li>
      ))}
    </ul>
  );
}

export default function AdminSettings() {
  const [params, setParams] = useSearchParams();
  const access = useAccess();
  const settingsLevel = access.level("settings");
  const PLATFORM_ONLY = ["commerce", "warehouse", "rewards", "platform"];
  const sections = SECTIONS.filter(
    (x) => !PLATFORM_ONLY.includes(x.key) || settingsLevel !== "none",
  );
  const section = sections.some((x) => x.key === params.get("section"))
    ? params.get("section")
    : "profile";
  const readOnly = PLATFORM_ONLY.includes(section) && settingsLevel === "view";
  const s = useSettings();
  const { toast, toastNode } = useToast();
  const current = sections.find((x) => x.key === section);
  const body = useMemo(
    () =>
      ({
        profile: ProfileSection,
        security: SecuritySection,
        commerce: CommerceSection,
        warehouse: WarehouseSection,
        rewards: RewardsSection,
        notifications: NotificationsSection,
        platform: PlatformSection,
      })[section],
    [section],
  );
  const Body = body;
  return (
    <div className="st-page ad-page">
      <nav className="st-nav" aria-label="Settings sections">
        {sections.map((x) => (
          <button
            key={x.key}
            type="button"
            className={section === x.key ? "on" : ""}
            aria-current={section === x.key ? "page" : undefined}
            onClick={() =>
              setParams(x.key === "profile" ? {} : { section: x.key })
            }
          >
            <x.icon size={18} />
            <span>
              <b>{x.label}</b>
              <small>{x.hint}</small>
            </span>
          </button>
        ))}
      </nav>
      <div className="st-body">
        <h2 className="st-title">{current.label}</h2>
        {readOnly && (
          <p className="st-note">
            <Info size={15} />
            <span>
              <b>View only.</b> You can see these settings, but only someone
              with edit access can change them.
            </span>
          </p>
        )}
        <fieldset className="st-fieldset" disabled={readOnly}>
          <Body s={s} toast={toast} />
        </fieldset>
      </div>
      {toastNode}
    </div>
  );
}
