import React, { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  UserPlus,
  Users,
  UserCheck,
  MailPlus,
  PauseCircle,
  Search,
  Lock,
  Eye,
  Pencil,
  Ban,
  RotateCcw,
  Trash2,
  Send,
  ShieldCheck,
  History,
  LayoutList,
  X,
  Crown,
  Check,
  Minus,
} from "lucide-react";

import {
  useTeam,
  useAccess,
  MODULES,
  GROUPS,
  ROLE_PRESETS,
  summarize,
  setMemberStatus,
  removeMember,
  resendInvite,
  setPreview,
} from "../../data/teamStore";
import { formatDate, timeAgo } from "../../utils/format";
import UserAvatar from "../../components/ui/UserAvatar";
import StatusBadge from "../../components/ui/StatusBadge";
import RowActionMenu from "../../components/ui/RowActionMenu";
import useToast from "../../components/ui/useToast";
import MemberModal from "./MemberModal";

import "../../css/AdminUI.css";
import "../../css/team/AdminTeam.css";

const TABS = [
  { key: "members", label: "Team members", icon: Users },
  { key: "roles", label: "Roles & permissions", icon: ShieldCheck },
  { key: "activity", label: "Activity", icon: History },
];
const FILTERS = ["All", "Active", "Invited", "Suspended"];

function AccessBar({ perms }) {
  const s = summarize(perms);
  return (
    <div className="tm-access">
      <div className="tm-access-bar" aria-hidden="true">
        <i className="edit" style={{ width: `${(s.edit / s.all) * 100}%` }} />
        <i className="view" style={{ width: `${(s.view / s.all) * 100}%` }} />
      </div>
      <span>
        {s.total === 0 ? (
          "No modules"
        ) : (
          <>
            <b>{s.edit}</b> edit · <b>{s.view}</b> view
          </>
        )}
      </span>
    </div>
  );
}

function Confirm({
  title,
  body,
  confirmLabel,
  tone = "danger",
  onConfirm,
  onClose,
}) {
  return (
    <div
      className="ad-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="ad-modal"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          type="button"
          className="ad-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <h3>{title}</h3>
        <p className="ad-modal-text">{body}</p>
        <div className="ad-modal-actions">
          <button
            type="button"
            className="ad-btn ad-btn-ghost"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`ad-btn ad-btn-${tone}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTeam() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get("tab"))
    ? params.get("tab")
    : "members";
  const navigate = useNavigate();
  const { members, log } = useTeam();
  const access = useAccess();
  const { toast, toastNode } = useToast();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(null); // { member?, startRole? }
  const [confirm, setConfirm] = useState(null);

  const subs = members.filter((m) => m.role !== "super");
  const kpi = {
    total: members.length,
    active: members.filter((m) => m.status === "Active").length,
    invited: members.filter((m) => m.status === "Invited").length,
    suspended: members.filter((m) => m.status === "Suspended").length,
  };

  const shown = useMemo(
    () =>
      members.filter((m) => {
        if (filter !== "All" && m.status !== filter) return false;
        const t = q.trim().toLowerCase();
        return (
          !t || `${m.name} ${m.email} ${m.roleLabel}`.toLowerCase().includes(t)
        );
      }),
    [members, q, filter],
  );

  const counts = Object.fromEntries(
    ROLE_PRESETS.map((r) => [
      r.key,
      subs.filter((m) => m.role === r.key).length,
    ]),
  );

  const menuFor = (m) => [
    {
      key: "edit",
      label: "Edit access",
      icon: Pencil,
      onClick: () => setModal({ member: m }),
    },
    ...(m.status === "Active"
      ? [
          {
            key: "view",
            label: "View as this person",
            icon: Eye,
            onClick: () => {
              setPreview(m.id);
              navigate("/admin-dashboard");
            },
          },
        ]
      : []),
    ...(m.status === "Invited"
      ? [
          {
            key: "resend",
            label: "Resend invite",
            icon: Send,
            onClick: () => {
              resendInvite(m.id);
              toast(`Invite resent to ${m.email}.`);
            },
          },
        ]
      : []),
    "separator",
    m.status === "Suspended"
      ? {
          key: "act",
          label: "Re-activate",
          icon: RotateCcw,
          onClick: () => {
            setMemberStatus(m.id, "Active");
            toast(`${m.name} can sign in again.`);
          },
        }
      : {
          key: "sus",
          label: "Suspend",
          icon: Ban,
          tone: "warning",
          onClick: () => setConfirm({ kind: "suspend", m }),
        },
    {
      key: "rm",
      label: "Remove from team",
      icon: Trash2,
      tone: "danger",
      onClick: () => setConfirm({ kind: "remove", m }),
    },
  ];

  const tiles = [
    {
      icon: Users,
      label: "Team size",
      value: kpi.total,
      hint: "Including you",
    },
    {
      icon: UserCheck,
      label: "Active",
      value: kpi.active,
      hint: "Can sign in now",
    },
    {
      icon: MailPlus,
      label: "Invited",
      value: kpi.invited,
      hint: "Not accepted yet",
    },
    {
      icon: PauseCircle,
      label: "Suspended",
      value: kpi.suspended,
      hint: "Access paused",
      warn: kpi.suspended > 0,
    },
  ];

  return (
    <div className="tm-page ad-page">
      <section className="tm-hero">
        <div>
          <span className="tm-eyebrow">
            <Crown size={14} /> You are the super admin
          </span>
          <h2>Decide who can do what</h2>
          <p>
            Add sub-admins such as warehouse staff or support, give each one
            view or edit access to only the parts of the admin they need, and
            check it by previewing the panel as them.
          </p>
        </div>
        <button
          type="button"
          className="ad-btn ad-btn-primary"
          onClick={() => setModal({})}
        >
          <UserPlus size={16} />
          Add sub-admin
        </button>
      </section>

      <div className="tm-tiles">
        {tiles.map((t) => (
          <div key={t.label} className={`tm-tile ${t.warn ? "warn" : ""}`}>
            <span>
              <t.icon size={18} />
            </span>
            <div>
              <small>{t.label}</small>
              <strong>{t.value}</strong>
              <em>{t.hint}</em>
            </div>
          </div>
        ))}
      </div>

      <nav className="tm-tabs" aria-label="Team sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? "on" : ""}
            aria-current={tab === t.key ? "page" : undefined}
            onClick={() => setParams(t.key === "members" ? {} : { tab: t.key })}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "members" && (
        <section className="tm-card">
          <div className="tm-toolbar">
            <label className="tm-search">
              <Search size={16} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, email or role"
                aria-label="Search team"
              />
            </label>
            <div className="tm-chips" role="group" aria-label="Status">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={filter === f ? "on" : ""}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="tm-empty">
              No one matches. Try another search or filter.
            </p>
          ) : (
            <div className="tm-table" role="table" aria-label="Team members">
              <div className="tm-row head" role="row">
                <span role="columnheader">Member</span>
                <span role="columnheader">Role</span>
                <span role="columnheader">Access</span>
                <span role="columnheader">Status</span>
                <span role="columnheader">Last active</span>
                <span role="columnheader" />
              </div>
              {shown.map((m) => (
                <div key={m.id} className="tm-row" role="row">
                  <div className="tm-person" role="cell">
                    <UserAvatar name={m.name} size={42} />
                    <div>
                      <strong>
                        {m.name}
                        {m.role === "super" && (
                          <em>
                            <Crown size={11} /> You
                          </em>
                        )}
                      </strong>
                      <small>{m.email}</small>
                    </div>
                  </div>
                  <div role="cell">
                    <span
                      className={`tm-role ${m.role === "super" ? "super" : ""}`}
                    >
                      {m.role === "super" ? "Super admin" : m.roleLabel}
                    </span>
                  </div>
                  <div role="cell">
                    {m.role === "super" ? (
                      <span className="tm-all">
                        <Lock size={13} /> Full access
                      </span>
                    ) : (
                      <AccessBar perms={m.permissions} />
                    )}
                  </div>
                  <div role="cell">
                    <StatusBadge status={m.status} />
                  </div>
                  <div role="cell" className="tm-last">
                    <span>
                      {m.lastActive ? timeAgo(m.lastActive) : "Never"}
                    </span>
                    <small>Added {formatDate(m.createdAt)}</small>
                  </div>
                  <div role="cell" className="tm-act">
                    {m.role === "super" ? null : (
                      <>
                        <button
                          type="button"
                          className="ad-btn ad-btn-ghost ad-btn-sm"
                          onClick={() => setModal({ member: m })}
                        >
                          Edit access
                        </button>
                        <RowActionMenu
                          label={`Actions for ${m.name}`}
                          items={menuFor(m)}
                        />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "roles" && (
        <>
          <div className="tm-rolecards">
            {ROLE_PRESETS.map((r) => {
              const s = summarize(r.permissions);
              return (
                <article key={r.key} className="tm-rolecard">
                  <header>
                    <h3>{r.label}</h3>
                    <span>
                      {counts[r.key] || 0}{" "}
                      {counts[r.key] === 1 ? "person" : "people"}
                    </span>
                  </header>
                  <p>{r.blurb}</p>
                  <div className="tm-rolefoot">
                    <span>
                      {r.key === "custom" ? (
                        "You choose"
                      ) : (
                        <>
                          <b>{s.edit}</b> edit · <b>{s.view}</b> view
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      className="ad-btn ad-btn-ghost ad-btn-sm"
                      onClick={() => setModal({ startRole: r.key })}
                    >
                      <UserPlus size={14} />
                      Use role
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <section className="tm-card">
            <header className="tm-card-head">
              <div>
                <h3>Permission matrix</h3>
                <p>
                  What each starting role can do. Anything can be adjusted per
                  person when you add or edit them.
                </p>
              </div>
            </header>
            <div className="tm-matrix-wrap">
              <table className="tm-mtable">
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>
                      <Crown size={13} /> Super admin
                    </th>
                    {ROLE_PRESETS.filter((r) => r.key !== "custom").map((r) => (
                      <th key={r.key}>{r.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {GROUPS.map((g) => (
                    <React.Fragment key={g}>
                      <tr className="grp">
                        <td colSpan={ROLE_PRESETS.length + 1}>{g}</td>
                      </tr>
                      {MODULES.filter((m) => m.group === g).map((m) => (
                        <tr key={m.key}>
                          <td>
                            <b>{m.label}</b>
                          </td>
                          <td>
                            <span className="tm-cell edit">
                              <Pencil size={12} />
                              {m.locked ? "View" : "Edit"}
                            </span>
                          </td>
                          {ROLE_PRESETS.filter((r) => r.key !== "custom").map(
                            (r) => {
                              const l = r.permissions[m.key] || "none";
                              return (
                                <td key={r.key}>
                                  <span className={`tm-cell ${l}`}>
                                    {l === "edit" ? (
                                      <Pencil size={12} />
                                    ) : l === "view" ? (
                                      <Eye size={12} />
                                    ) : (
                                      <Minus size={12} />
                                    )}
                                    {l === "none"
                                      ? "None"
                                      : l === "view"
                                        ? "View"
                                        : "Edit"}
                                  </span>
                                </td>
                              );
                            },
                          )}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  <tr>
                    <td>
                      <b>Team & Roles</b>
                    </td>
                    <td>
                      <span className="tm-cell edit">
                        <Pencil size={12} />
                        Edit
                      </span>
                    </td>
                    {ROLE_PRESETS.filter((r) => r.key !== "custom").map((r) => (
                      <td key={r.key}>
                        <span className="tm-cell none">
                          <Minus size={12} />
                          Never
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === "activity" && (
        <section className="tm-card">
          <header className="tm-card-head">
            <div>
              <h3>Recent changes to the team</h3>
              <p>Who was added, changed, suspended or removed.</p>
            </div>
          </header>
          <ul className="tm-log">
            {log.map((l) => (
              <li key={l.id}>
                <span className="dot">
                  <Check size={12} />
                </span>
                <div>
                  <strong>{l.what}</strong>
                  <small>by {l.who}</small>
                </div>
                <time>{timeAgo(l.at)}</time>
              </li>
            ))}
          </ul>
        </section>
      )}

      {modal && (
        <MemberModal
          member={modal.member}
          startRole={modal.startRole}
          onClose={() => setModal(null)}
          onDone={toast}
        />
      )}
      {confirm && (
        <Confirm
          title={
            confirm.kind === "remove"
              ? `Remove ${confirm.m.name}?`
              : `Suspend ${confirm.m.name}?`
          }
          body={
            confirm.kind === "remove"
              ? "They lose all access immediately and will need a new invite to come back."
              : "They can’t sign in until you re-activate them. Their permissions are kept."
          }
          confirmLabel={confirm.kind === "remove" ? "Remove" : "Suspend"}
          tone={confirm.kind === "remove" ? "danger" : "warning"}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.kind === "remove") {
              removeMember(confirm.m.id);
              toast(`${confirm.m.name} was removed.`);
            } else {
              setMemberStatus(confirm.m.id, "Suspended");
              toast(`${confirm.m.name} was suspended.`);
            }
            setConfirm(null);
          }}
        />
      )}
      {toastNode}
    </div>
  );
}
