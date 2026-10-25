import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight, ArrowLeft, ShieldAlert, ExternalLink, Check, Quote, Repeat2, Mail, MapPin, CalendarDays,
  Star, NotebookPen, AlertTriangle, ArrowRight, UserRound, BadgeCheck, Gavel, Timer,
} from "lucide-react";

import { useComplaint, useComplaints, runComplaintAction, addNote, isActive } from "../../data/complaintsStore";
import { getComplaintActions, COMPLAINT_ACTIONS } from "../../data/complaintActions";
import { useTeam, useAccess } from "../../data/teamStore";
import { formatDate, formatDateTime, formatINR, timeAgo } from "../../utils/format";

import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import EmptyState from "../../components/ui/EmptyState";
import { ACTION_ICONS } from "../../components/ui/actionIcons";
import useToast from "../../components/ui/useToast";
import ComplaintActionModal from "./components/ComplaintActionModal";
import { TypeChip, PriorityChip, SlaChip, TargetThumb, Stars, hoursText } from "./components/ComplaintBadges";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/users/AdminUserProfile.css";
import "../../css/products/AdminProducts.css";
import "../../css/orders/AdminOrders.css";
import "../../css/donations/AdminDonations.css";
import "../../css/pickups/AdminPickups.css";
import "../../css/complaints/AdminComplaints.css";

const STEPS = [
  { key: "filed", label: "Filed" },
  { key: "review", label: "Under review" },
  { key: "decided", label: "Decided" },
];

const HINTS = {
  start: "Take it on so the team knows someone is looking.",
  assign: "Hand it to a teammate.",
  dismiss: "No rule was broken. The reporter is told why.",
  warn: "Send a written warning and close the complaint.",
  suspend: "Lock the account until it is reactivated.",
  block: "For serious or repeated violations.",
  removeProduct: "Take the listing off the marketplace.",
  removeReview: "Hide the review. Its rating stops counting.",
  reopen: "Look at it again. The earlier decision stays in the history.",
};

const RESULT_LABEL = {
  dismissed: "Dismissed",
  warned: "Warning sent",
  suspended: "Account suspended",
  blocked: "Account blocked",
  removedProduct: "Listing removed",
  removedReview: "Review removed",
};

function Stepper({ status }) {
  const current = status === "Open" ? 0 : status === "Under_Review" ? 1 : 2;
  return (
    <ol className="aup-steps cp-steps" aria-label={`Complaint progress: ${status.replace("_", " ")}`}>
      {STEPS.map((step, i) => {
        const done = i < current || (i === 2 && !isActive({ status }));
        return (
          <li key={step.key} className={done ? "done" : i === current ? "current" : ""}>
            <span>{done ? <Check size={11} strokeWidth={3} /> : i + 1}</span>
            <em>{step.label}</em>
          </li>
        );
      })}
    </ol>
  );
}

/* What exactly was reported, shown differently for each kind. */
function Evidence({ c }) {
  const t = c.target;
  if (t.type === "Review") {
    return (
      <>
        <div className="cp-review">
          <div className="cp-review-top"><Stars n={t.rating} /><StatusBadge status={t.status} /></div>
          <blockquote><Quote size={16} /> {t.text}</blockquote>
          <p>Written by <strong>{t.reviewer}</strong> on <strong>{t.onProduct}</strong> · {formatDate(t.at)}</p>
        </div>
        <div className="cp-owner">
          <UserAvatar name={t.owner.name} src={t.owner.image} size={40} rounded="12px" />
          <div><strong>{t.owner.name}</strong><span>The ReMaker this review is about</span></div>
          <StatusBadge status={t.owner.status} />
          <Link to={t.owner.path} className="ad-btn ad-btn-ghost ad-btn-sm"><ExternalLink size={14} /> Open ReMaker</Link>
        </div>
      </>
    );
  }
  if (t.type === "Product") {
    return (
      <>
        <div className="cp-product">
          <img src={t.image} alt={t.name} />
          <div>
            <h4>{t.name}</h4>
            <p>{t.category} · {formatINR(t.price)}</p>
            <StatusBadge status={t.status === "Live" ? "Live" : t.status} />
          </div>
          <Link to={t.path} className="ad-btn ad-btn-ghost ad-btn-sm"><ExternalLink size={14} /> Open listing</Link>
        </div>
        <div className="cp-owner">
          <UserAvatar name={t.owner.name} src={t.owner.image} size={40} rounded="12px" />
          <div><strong>{t.owner.name}</strong><span>Listed by · {t.owner.role}</span></div>
          <StatusBadge status={t.owner.status} />
          <Link to={t.owner.path} className="ad-btn ad-btn-ghost ad-btn-sm"><ExternalLink size={14} /> Open {t.owner.role}</Link>
        </div>
      </>
    );
  }
  return (
    <div className="cp-product">
      <UserAvatar name={t.name} src={t.image} size={64} rounded="18px" />
      <div>
        <h4>{t.name}</h4>
        <p>{t.type === "ReMaker" ? "ReMaker" : "User"} · {t.sub}</p>
        <ul className="cp-facts">
          <li><Mail size={13} /> {t.email}</li>
          <li><MapPin size={13} /> {t.city}</li>
          <li><CalendarDays size={13} /> Joined {formatDate(t.since)}</li>
          {t.rating > 0 && <li><Star size={13} /> {t.rating} rating</li>}
        </ul>
        <StatusBadge status={t.status} />
      </div>
      <Link to={t.path} className="ad-btn ad-btn-ghost ad-btn-sm"><ExternalLink size={14} /> Open profile</Link>
    </div>
  );
}

export default function AdminComplaintDetails() {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const c = useComplaint(complaintId);
  const all = useComplaints();
  const { members } = useTeam();
  const access = useAccess();
  const { toast, toastNode } = useToast();
  const [pending, setPending] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => { window.scrollTo({ top: 0 }); }, [complaintId]);

  const assignable = useMemo(() => members.filter((m) => m.status === "Active" && (m.role === "super" || ["view", "edit"].includes(m.permissions?.complaints))), [members]);
  const myName = access.me?.name || "Admin";

  if (!c) {
    return (
      <div className="aup-page">
        <section className="aup-card">
          <EmptyState icon={ShieldAlert} title="Complaint not found" text="This complaint does not exist or the link is wrong."
            action={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => navigate("/admin-complaints")}><ArrowLeft size={14} /> Back to complaints</button>} />
        </section>
      </div>
    );
  }

  const active = isActive(c);
  const actions = getComplaintActions(c);
  const heroActions = actions.filter((a) => a.key !== "assign").slice(0, 3);
  const otherActive = c.others.filter(isActive);

  const run = (action) => {
    if (action.fields === "none") {
      runComplaintAction(c, action.key, { by: myName, assigneeId: access.me?.id }, all);
      toast(`${c.id} ${action.toast}.`);
      return;
    }
    setPending(action);
  };
  const confirm = (payload) => {
    runComplaintAction(c, pending.key, { ...payload, by: myName }, all);
    toast(`${c.id} ${pending.toast}.`);
    setPending(null);
  };
  const saveNote = (e) => {
    e.preventDefault();
    if (note.trim().length < 3) return;
    addNote(c.id, note.trim(), myName);
    setNote("");
    toast("Note added.");
  };

  return (
    <div className="aup-page">
      <nav className="aup-crumbs" aria-label="Breadcrumb">
        <Link to="/admin-complaints" className="aup-back"><ArrowLeft size={15} /> Complaints</Link>
        <ChevronRight size={14} />
        <span aria-current="page">{c.id}</span>
      </nav>

      {/* ---------- hero ---------- */}
      <section className="aup-hero">
        <div className="aup-hero-main">
          <TargetThumb t={c.target} size={72} />
          <div className="aup-hero-info">
            <div className="aup-hero-name">
              <h2>{c.category}</h2>
              <StatusBadge status={c.status} />
              <PriorityChip priority={c.priority} />
              <SlaChip c={c} />
            </div>
            <ul className="aup-hero-meta">
              <li><ShieldAlert size={14} /> {c.id}</li>
              <li><TypeChip type={c.type} /></li>
              <li><CalendarDays size={14} /> Filed {formatDate(c.createdAt)} ({timeAgo(c.createdAt)})</li>
            </ul>
          </div>
        </div>
        {heroActions.length > 0 && (
          <div className="ao-hero-side">
            <div className="aup-hero-actions">
              {heroActions.map((a) => {
                const Icon = ACTION_ICONS[a.icon];
                return <button key={a.key} type="button" className={`aup-hero-btn tone-${a.tone}`} onClick={() => run(a)}>{Icon && <Icon size={15} />} {a.short}</button>;
              })}
            </div>
          </div>
        )}
      </section>

      {/* ---------- notices ---------- */}
      {c.sla?.overdue && (
        <div className="aup-notice tone-blocked" role="alert">
          <strong>This complaint is {hoursText(c.sla.overdueH)} past its response time.</strong>
          <span>{c.priority}-priority complaints should be decided within {c.sla.limit} hours. {c.status === "Open" ? "Start a review so the team knows it is being handled." : "Please make a decision soon."}</span>
        </div>
      )}
      {active && otherActive.length > 0 && (
        <div className="aup-notice tone-suspended" role="status">
          <strong>{otherActive.length + 1} people have reported this {c.type === "Product" ? "listing" : c.type === "Review" ? "review" : c.type.toLowerCase()}.</strong>
          <span>When you decide, you can resolve the other {otherActive.length} complaint{otherActive.length === 1 ? "" : "s"} in the same step.</span>
        </div>
      )}
      {active && ((c.type === "User" || c.type === "ReMaker") && ["Suspended", "Blocked"].includes(c.target.status)) && (
        <p className="apd-warn"><AlertTriangle size={15} /> This account is already {c.target.status.toLowerCase()}. You can still warn or dismiss, or close the complaint with the decision already taken.</p>
      )}
      {active && c.type === "Product" && !c.target.live && (
        <p className="apd-warn"><AlertTriangle size={15} /> This listing is not live right now, so there is nothing to take down.</p>
      )}
      {!active && c.resolution && (
        <div className={`aup-notice ${c.status === "Dismissed" ? "tone-deleted" : "tone-suspended"}`} role="status">
          <strong>{RESULT_LABEL[c.resolution.action] || c.status.replace("_", " ")}{c.tookH ? ` · decided in ${hoursText(c.tookH)}` : ""}</strong>
          <span>{c.resolution.note}</span>
        </div>
      )}

      <section className="aup-card dn-progress">
        <header className="aup-card-head"><div><h3>Progress</h3><p>From the report to a decision.</p></div></header>
        <Stepper status={c.status} />
      </section>

      <div className="aup-grid-2">
        {/* ---------- left ---------- */}
        <div className="aup-stack">
          <section className="aup-card">
            <header className="aup-card-head"><div><h3>The complaint</h3><p>What the reporter said.</p></div><TypeChip type={c.type} /></header>
            <blockquote className="cp-quote"><Quote size={18} /> {c.description}</blockquote>
            <div className="cp-reporter">
              <UserAvatar name={c.reporter.name} size={38} rounded="11px" />
              <div><strong>{c.reporter.name}</strong><span>Reported as {c.reporter.role.toLowerCase() === "staff" ? "ReOrbit staff" : `a ${c.reporter.role}`} · {formatDateTime(c.createdAt)}</span></div>
            </div>
          </section>

          <section className="aup-card">
            <header className="aup-card-head"><div><h3>What was reported</h3><p>The live record, so you can check before deciding.</p></div></header>
            <Evidence c={c} />
          </section>

          {c.others.length > 0 && (
            <section className="aup-card">
              <header className="aup-card-head"><div><h3><Repeat2 size={16} style={{ verticalAlign: "-2px" }} /> Other complaints about this</h3><p>{c.others.length} more on the same {c.type === "Product" ? "listing" : c.type === "Review" ? "review" : c.type.toLowerCase()}.</p></div></header>
              <ul className="cp-others">
                {c.others.map((o) => (
                  <li key={o.id}>
                    <Link to={`/admin-complaints/${o.id}`}>
                      <span><strong>{o.category}</strong><small>{o.id} · {o.reporter.name} · {timeAgo(o.createdAt)}</small></span>
                      <StatusBadge status={o.status} />
                      <ArrowRight size={14} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {c.warnings.length > 0 && (
            <section className="aup-card">
              <header className="aup-card-head"><div><h3>Warnings on record</h3><p>Earlier warnings sent about this {c.type === "Product" ? "listing" : c.type === "Review" ? "review" : c.type.toLowerCase()}.</p></div></header>
              <ul className="cp-warns">
                {[...c.warnings].reverse().map((w, i) => (
                  <li key={i}><strong>{w.complaintId} · {w.by}</strong><p>{w.message}</p><time>{formatDateTime(w.at)}</time></li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ---------- right ---------- */}
        <div className="aup-stack">
          <section className="aup-card">
            <header className="aup-card-head">
              <div><h3>{active ? "Decide" : "Decision"}</h3><p>{active ? "Pick one. You will be asked for a reason." : "How this complaint ended."}</p></div>
              {active && <Gavel size={18} className="cp-head-icon" />}
            </header>
            {active ? (
              <ul className="cp-decisions">
                {actions.filter((a) => !["start", "assign"].includes(a.key)).map((a) => {
                  const Icon = ACTION_ICONS[a.icon];
                  return (
                    <li key={a.key}>
                      <button type="button" className={`cp-decision tone-${a.tone}`} onClick={() => run(a)}>
                        <span className="cp-decision-icon">{Icon && <Icon size={17} />}</span>
                        <span><strong>{a.label}</strong><small>{HINTS[a.key]}</small></span>
                        <ArrowRight size={15} />
                      </button>
                    </li>
                  );
                })}
                {c.status === "Open" && (
                  <li className="cp-decision-start">
                    <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => run(actions.find((a) => a.key === "start"))}>Start review first</button>
                  </li>
                )}
              </ul>
            ) : c.resolution ? (
              <>
                <dl className="ao-txn" style={{ margin: 0 }}>
                  <div><dt>Result</dt><dd>{RESULT_LABEL[c.resolution.action] || c.status.replace("_", " ")}</dd></div>
                  <div><dt>Decided by</dt><dd>{c.resolution.by}</dd></div>
                  <div><dt><Timer size={13} /> Time taken</dt><dd>{c.tookH ? hoursText(c.tookH) : "—"}</dd></div>
                  <div><dt>On</dt><dd>{formatDateTime(c.resolution.at)}</dd></div>
                </dl>
                <p className="cp-res-note">{c.resolution.note}</p>
                <div className="cp-reopen">
                  <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => run(actions[0])}>Reopen complaint</button>
                </div>
              </>
            ) : null}
          </section>

          <section className="aup-card">
            <header className="aup-card-head">
              <div><h3>Assigned to</h3><p>Who is handling it.</p></div>
              {active && <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => run(COMPLAINT_ACTIONS.assign)}>{c.assignee ? "Reassign" : "Assign"}</button>}
            </header>
            {c.assignee ? (
              <div className="cp-assignee">
                <UserAvatar name={c.assignee.name} size={42} rounded="12px" />
                <div><strong>{c.assignee.name}</strong><span>{c.assignee.roleLabel}</span></div>
                <BadgeCheck size={16} />
              </div>
            ) : (
              <p className="ap-muted"><UserRound size={14} style={{ verticalAlign: "-2px" }} /> Nobody yet.</p>
            )}
          </section>

          <section className="aup-card">
            <header className="aup-card-head"><div><h3>Team notes</h3><p>Private. Only the admin team sees these.</p></div><NotebookPen size={18} className="cp-head-icon" /></header>
            <form className="cp-note-form" onSubmit={saveNote}>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add what you found, such as a call you made or a screenshot you checked" aria-label="Note" />
              <button type="submit" className="ad-btn ad-btn-primary ad-btn-sm" disabled={note.trim().length < 3}>Add note</button>
            </form>
            {c.notes.length > 0 && (
              <ul className="cp-notes">
                {[...c.notes].reverse().map((n) => (
                  <li key={n.id}><p>{n.text}</p><small>{n.by} · {formatDateTime(n.at)}</small></li>
                ))}
              </ul>
            )}
          </section>

          <section className="aup-card">
            <header className="aup-card-head"><div><h3>History</h3><p>Every step so far.</p></div></header>
            <ol className="apd-tl">
              {[...c.events].reverse().map((e) => (
                <li key={e.id}>
                  <i className={`apd-dot ${e.tone}`} />
                  <div><strong>{e.label}</strong><p>{e.detail}</p><time>{formatDateTime(e.at)}</time></div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <ComplaintActionModal action={pending} complaints={pending ? [c] : []} members={assignable} onConfirm={confirm} onClose={() => setPending(null)} />
      {toastNode}
    </div>
  );
}
