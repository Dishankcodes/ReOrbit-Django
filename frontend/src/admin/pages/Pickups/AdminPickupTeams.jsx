import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, Search, X, Users, UserPlus, Plus, Truck, MapPin, Phone, Crown, Pencil, PauseCircle, PlayCircle,
  Trash2, ArrowRightLeft, ExternalLink, UserCheck, UserMinus, AlertTriangle, CalendarCheck2, AlarmClock, UsersRound, SearchX, Route,
} from "lucide-react";

import {
  usePickupTeams, createTeam, updateTeam, setTeamStatus, removeTeam, reassignPickups,
  addMember, updateMember, makeLead, setMemberStatus, removeMember, moveMember,
} from "../../data/pickupTeamsStore";
import { useAccess } from "../../data/teamStore";
import { formatDate } from "../../utils/format";

import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import EmptyState from "../../components/ui/EmptyState";
import RowActionMenu from "../../components/ui/RowActionMenu";
import useToast from "../../components/ui/useToast";
import { TeamFormModal, MemberFormModal, MoveMemberModal, TeamStatusModal, RemoveMemberModal } from "./components/TeamModals";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/orders/AdminOrders.css";
import "../../css/donations/AdminDonations.css";
import "../../css/pickups/AdminPickups.css";
import "../../css/pickups/AdminPickupTeams.css";

const FILTERS = [
  { key: "all", label: "All teams" },
  { key: "Active", label: "Active" },
  { key: "Paused", label: "Paused" },
  { key: "attention", label: "Needs attention" },
];

function RoleChip({ role }) {
  return <span className={`pt-role ${role.toLowerCase()}`}>{role === "Lead" && <Crown size={11} />} {role}</span>;
}

export default function AdminPickupTeams() {
  const navigate = useNavigate();
  const teams = usePickupTeams();
  const access = useAccess();
  const { toast, toastNode } = useToast();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [teamForm, setTeamForm] = useState(null);        // { team } | {}  (empty = create)
  const [memberForm, setMemberForm] = useState(null);    // { team?, member? }
  const [moving, setMoving] = useState(null);            // { team, member }
  const [removing, setRemoving] = useState(null);        // { team, member }
  const [status, setStatus] = useState(null);            // { mode, team }

  const needsAttention = (t) => t.noLead || t.late.length > 0 || (t.status === "Paused" && t.movable.length > 0);

  const kpi = useMemo(() => {
    const active = teams.filter((t) => t.status === "Active");
    const ready = teams.filter((t) => t.ready);
    const people = teams.reduce((n, t) => n + t.crew.length, 0);
    const today = teams.reduce((n, t) => n + t.todayLoad, 0);
    const cap = ready.reduce((n, t) => n + t.capacity, 0);
    return {
      total: teams.length, active: active.length, paused: teams.length - active.length, people,
      leave: teams.reduce((n, t) => n + t.members.filter((m) => m.status === "On leave").length, 0),
      today, cap, late: teams.reduce((n, t) => n + t.late.length, 0), attention: teams.filter(needsAttention).length,
    };
  }, [teams]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teams
      .filter((t) => filter === "all" || (filter === "attention" ? needsAttention(t) : t.status === filter))
      .filter((t) => !q || [t.name, t.area, t.vehicle, ...t.members.flatMap((m) => [m.name, m.phone])].some((v) => String(v).toLowerCase().includes(q)));
  }, [teams, query, filter]);

  /* ---------- actions ---------- */
  const saveTeam = (values) => {
    if (teamForm.team) {
      updateTeam(teamForm.team.id, values);
      toast(`${teamForm.team.name} was updated.`);
    } else {
      createTeam(values);
      toast(`${values.name.trim()} was created with ${1 + (values.crew || []).filter((c) => c.name.trim()).length} people.`);
    }
    setTeamForm(null);
  };
  const saveMember = (teamId, values) => {
    const t = teams.find((x) => x.id === teamId);
    if (memberForm.member) {
      updateMember(teamId, memberForm.member.id, values);
      toast(`${values.name.trim()} was updated.`);
    } else {
      addMember(teamId, values);
      toast(`${values.name.trim()} joined ${t.name} as ${values.role}.`);
    }
    setMemberForm(null);
  };
  const doMove = (toId) => {
    const dest = teams.find((t) => t.id === toId);
    moveMember(moving.team.id, moving.member.id, toId);
    toast(`${moving.member.name} moved to ${dest.name}.`);
    setMoving(null);
  };
  const doRemoveMember = () => {
    removeMember(removing.team.id, removing.member.id);
    toast(`${removing.member.name} was removed from ${removing.team.name}.`);
    setRemoving(null);
  };
  const confirmStatus = ({ reason, moveTo }) => {
    const { mode, team } = status;
    let moved = 0;
    if (moveTo && team.movable.length) { reassignPickups(team.movable, moveTo); moved = team.movable.length; }
    if (mode === "pause") setTeamStatus(team.id, "Paused", reason);
    if (mode === "resume") setTeamStatus(team.id, "Active");
    if (mode === "remove") removeTeam(team.id);
    const verb = mode === "pause" ? "was paused" : mode === "resume" ? "is active again" : "was removed";
    toast(`${team.name} ${verb}${moved ? ` and ${moved} pickup${moved === 1 ? "" : "s"} moved to ${moveTo}` : ""}.`);
    setStatus(null);
  };

  const teamMenu = (t) => [
    { key: "edit", label: "Edit team", icon: Pencil, onClick: () => setTeamForm({ team: t }) },
    { key: "add", label: "Add member", icon: UserPlus, onClick: () => setMemberForm({ team: t }) },
    { key: "view", label: "View its pickups", icon: ExternalLink, onClick: () => navigate(`/admin-pickups?team=${encodeURIComponent(t.name)}`) },
    "separator",
    t.status === "Active"
      ? { key: "pause", label: "Pause team", icon: PauseCircle, tone: "warning", onClick: () => setStatus({ mode: "pause", team: t }) }
      : { key: "resume", label: "Resume team", icon: PlayCircle, onClick: () => setStatus({ mode: "resume", team: t }) },
    { key: "remove", label: "Remove team", icon: Trash2, tone: "danger", onClick: () => setStatus({ mode: "remove", team: t }) },
  ];
  const memberMenu = (t, m) => [
    { key: "edit", label: "Edit details", icon: Pencil, onClick: () => setMemberForm({ team: t, member: m }) },
    ...(m.role !== "Lead" && m.status === "Active" ? [{ key: "lead", label: "Make team lead", icon: Crown, onClick: () => { makeLead(t.id, m.id); toast(`${m.name} is now the lead of ${t.name}.`); } }] : []),
    m.status === "Active"
      ? { key: "leave", label: "Mark on leave", icon: UserMinus, onClick: () => { setMemberStatus(t.id, m.id, "On leave"); toast(`${m.name} is on leave.`); } }
      : { key: "back", label: "Back on duty", icon: UserCheck, onClick: () => { setMemberStatus(t.id, m.id, "Active"); toast(`${m.name} is back on duty.`); } },
    ...(teams.length > 1 ? [{ key: "move", label: "Move to another team", icon: ArrowRightLeft, onClick: () => setMoving({ team: t, member: m }) }] : []),
    "separator",
    { key: "remove", label: "Remove from team", icon: Trash2, tone: "danger", onClick: () => setRemoving({ team: t, member: m }) },
  ];

  const readyOthers = (t) => teams.filter((x) => x.ready && x.id !== t.id);

  return (
    <div className="au-page">
      <nav className="aup-crumbs" aria-label="Breadcrumb">
        <Link to="/admin-pickups" className="aup-back"><ArrowLeft size={15} /> Pickups</Link>
        <ChevronRight size={14} />
        <span aria-current="page">Pickup teams</span>
      </nav>

      {/* ---------- summary ---------- */}
      <section className="ao-money" aria-label="Team summary">
        <div className="ao-money-card">
          <span className="ao-money-icon info"><UsersRound size={18} /></span>
          <div><small>Pickup teams</small><strong>{kpi.total}</strong><em>{kpi.active} active{kpi.paused ? ` · ${kpi.paused} paused` : ""}</em></div>
        </div>
        <div className="ao-money-card">
          <span className="ao-money-icon good"><UserCheck size={18} /></span>
          <div><small>People on duty</small><strong>{kpi.people}</strong><em>{kpi.leave ? `${kpi.leave} on leave` : "Everyone is available"}</em></div>
        </div>
        <button type="button" className="ao-money-card is-link" onClick={() => navigate("/admin-pickups")}>
          <span className="ao-money-icon info"><CalendarCheck2 size={18} /></span>
          <div><small>Stops today</small><strong>{kpi.today}<span className="pt-of"> / {kpi.cap}</span></strong><em>Of what the ready teams can carry</em></div>
        </button>
        <button type="button" className="ao-money-card is-link" onClick={() => setFilter("attention")}>
          <span className={`ao-money-icon ${kpi.attention ? "bad" : "good"}`}><AlarmClock size={18} /></span>
          <div><small>Need attention</small><strong>{kpi.attention}</strong><em>No lead, overdue stops or paused with work</em></div>
        </button>
      </section>

      {/* ---------- toolbar ---------- */}
      <section className="au-panel pt-panel">
        <div className="au-toolbar">
          <label className="au-search">
            <Search size={16} />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a team, area, vehicle, person or phone" aria-label="Search teams" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
          </label>
          <div className="au-toolbar-right">
            <div className="pt-filter" role="group" aria-label="Filter teams">
              {FILTERS.map((f) => (
                <button key={f.key} type="button" className={filter === f.key ? "on" : ""} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>
              ))}
            </div>
            <button type="button" className="ad-btn ad-btn-ghost" disabled={!teams.length} onClick={() => setMemberForm({})}><UserPlus size={15} /> Add member</button>
            <button type="button" className="ad-btn ad-btn-primary" onClick={() => setTeamForm({})}><Plus size={15} /> Add team</button>
          </div>
        </div>
      </section>

      {/* ---------- team cards ---------- */}
      {shown.length > 0 ? (
        <div className="pt-grid">
          {shown.map((t) => {
            const pct = Math.min(100, Math.round((t.todayLoad / t.capacity) * 100));
            const next = [...t.stops, ...t.upcoming].slice(0, 3);
            return (
              <article key={t.id} className={`pt-card ${t.status === "Paused" ? "is-paused" : ""}`} aria-label={t.name}>
                <header className="pt-card-head">
                  <span className="pk-col-avatar pt-avatar">{t.name.replace(/^Pickup team\s*/i, "").slice(0, 2).toUpperCase() || "T"}</span>
                  <div className="pt-card-title">
                    <h3>{t.name}</h3>
                    <p><MapPin size={12} /> {t.area}</p>
                  </div>
                  <StatusBadge status={t.status} />
                  <RowActionMenu label={`Actions for ${t.name}`} items={teamMenu(t)} />
                </header>

                <p className="pt-vehicle"><Truck size={13} /> {t.vehicle}</p>
                {t.note && <p className="pt-note">{t.note}</p>}

                {t.status === "Paused" && (
                  <p className="pt-callout warn"><PauseCircle size={14} /> Paused{t.pausedReason ? `: ${t.pausedReason}` : ""}. It is hidden when scheduling.{t.movable.length > 0 && ` ${t.movable.length} scheduled pickup${t.movable.length === 1 ? " is" : "s are"} still with this team.`}</p>
                )}
                {t.status === "Active" && t.noLead && (
                  <p className="pt-callout warn"><AlertTriangle size={14} /> No active lead, so this team cannot take new pickups. Make someone the lead below.</p>
                )}

                <div className="pt-meter" aria-label={`${t.todayLoad} of ${t.capacity} stops today`}>
                  <div className="pt-meter-top"><span>Today</span><strong>{t.todayLoad} of {t.capacity} stops</strong></div>
                  <div className="pt-bar"><span className={t.full ? "full" : ""} style={{ width: `${pct}%` }} /></div>
                </div>
                <dl className="pt-stats">
                  <div><dt>Upcoming</dt><dd>{t.upcoming.length}</dd></div>
                  <div className={t.late.length ? "bad" : ""}><dt>Overdue</dt><dd>{t.late.length}</dd></div>
                  <div><dt>Picked up</dt><dd>{t.done}</dd></div>
                </dl>

                <div className="pt-people-head">
                  <h4>People <em>{t.members.length}</em></h4>
                  <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setMemberForm({ team: t })}><UserPlus size={14} /> Add member</button>
                </div>
                {t.members.length > 0 ? (
                  <ul className="pt-people">
                    {[...t.members].sort((a, b) => (a.role === "Lead" ? -1 : b.role === "Lead" ? 1 : 0)).map((m) => (
                      <li key={m.id} className={m.status === "On leave" ? "is-leave" : ""}>
                        <UserAvatar name={m.name} size={36} rounded="11px" />
                        <div>
                          <strong>{m.name} <RoleChip role={m.role} /></strong>
                          <a href={`tel:${m.phone.replace(/\s/g, "")}`} onClick={(e) => e.stopPropagation()}><Phone size={11} /> {m.phone}</a>
                        </div>
                        {m.status === "On leave" && <StatusBadge status="On leave" />}
                        <RowActionMenu label={`Actions for ${m.name}`} items={memberMenu(t, m)} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pt-empty">Nobody is on this team yet.</p>
                )}

                <div className="pt-next">
                  <h4><Route size={14} /> Next stops</h4>
                  {next.length > 0 ? (
                    <ol>
                      {next.map((p) => (
                        <li key={p.id}><button type="button" onClick={() => navigate(`/admin-pickups/${p.id}`)}><strong>{p.title}</strong><small>{p.due.key === "today" ? "Today" : formatDate(p.date)} · {p.slot}</small></button></li>
                      ))}
                    </ol>
                  ) : <p className="pt-empty">No stops scheduled.</p>}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="au-panel">
          <EmptyState
            icon={teams.length ? SearchX : Users}
            title={teams.length ? "No team matches your search" : "No pickup teams yet"}
            text={teams.length ? "Try a different search or show all teams." : "Add a team so pickups can be scheduled."}
            action={teams.length
              ? <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => { setQuery(""); setFilter("all"); }}>Clear filters</button>
              : <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => setTeamForm({})}><Plus size={14} /> Add team</button>}
          />
        </section>
      )}

      <TeamFormModal open={!!teamForm} team={teamForm?.team || null} onSave={saveTeam} onClose={() => setTeamForm(null)} />
      <MemberFormModal open={!!memberForm} team={memberForm?.team || null} teams={teams} member={memberForm?.member || null} onSave={saveMember} onClose={() => setMemberForm(null)} />
      <MoveMemberModal open={!!moving} team={moving?.team} member={moving?.member} teams={teams} onMove={doMove} onClose={() => setMoving(null)} />
      <RemoveMemberModal open={!!removing} team={removing?.team} member={removing?.member} onConfirm={doRemoveMember} onClose={() => setRemoving(null)} />
      <TeamStatusModal open={!!status} mode={status?.mode} team={status?.team} others={status ? readyOthers(status.team) : []} onConfirm={confirmStatus} onClose={() => setStatus(null)} />
      {toastNode}
    </div>
  );
}
