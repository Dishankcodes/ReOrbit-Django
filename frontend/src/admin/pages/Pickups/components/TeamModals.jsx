import React, { useEffect, useState } from "react";
import { X, Users, UserPlus, PauseCircle, PlayCircle, Trash2, ArrowRightLeft, Plus, Crown, AlertTriangle } from "lucide-react";
import { ROLES, VEHICLES, nameTaken, phoneOk, phoneTaken } from "../../../data/pickupTeamsStore";

/* Shared frame: backdrop, Escape to close, scroll lock. */
function Shell({ open, onClose, icon: Icon, tone = "positive", title, text, children, wide, onSubmit, labelId }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="ad-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className={`ad-modal ${wide ? "pt-modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={labelId} onSubmit={onSubmit} noValidate>
        <button type="button" className="ad-modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        <div className={`ad-modal-icon tone-${tone}`}><Icon size={22} strokeWidth={1.7} /></div>
        <h3 id={labelId}>{title}</h3>
        {text && <p className="ad-modal-text">{text}</p>}
        {children}
      </form>
    </div>
  );
}

const Err = ({ show, children }) => (show ? <small className="ad-modal-error">{children}</small> : null);

/* ======================= team: add / edit ======================= */
const blankPerson = { name: "", phone: "", role: "Driver" };

export function TeamFormModal({ open, team, onSave, onClose }) {
  const editing = !!team;
  const [f, setF] = useState({ name: "", area: "", vehicle: VEHICLES[0], capacity: 5, note: "" });
  const [lead, setLead] = useState({ name: "", phone: "" });
  const [crew, setCrew] = useState([{ ...blankPerson }, { ...blankPerson, role: "Helper" }]);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setF(team ? { name: team.name, area: team.area, vehicle: team.vehicle, capacity: team.capacity, note: team.note } : { name: "", area: "", vehicle: VEHICLES[0], capacity: 5, note: "" });
    setLead({ name: "", phone: "" });
    setCrew([{ ...blankPerson }, { ...blankPerson, role: "Helper" }]);
  }, [open, team]);

  const nameLocked = editing && team.total > 0;
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }));
  const errs = {
    name: f.name.trim().length < 3 ? "Give the team a name of at least 3 letters." : nameTaken(f.name, team?.id) ? "Another team already uses this name." : "",
    area: f.area.trim().length < 3 ? "Say where this team works." : "",
    capacity: !(Number(f.capacity) >= 1 && Number(f.capacity) <= 20) ? "Choose a number from 1 to 20." : "",
    leadName: !editing && lead.name.trim().length < 3 ? "A team needs a lead. Enter their name." : "",
    leadPhone: !editing && (!phoneOk(lead.phone) ? "Enter a valid phone number." : phoneTaken(lead.phone) ? "This number belongs to someone already on a team." : ""),
  };
  const crewErrs = crew.map((c) => {
    if (editing || (!c.name.trim() && !c.phone.trim())) return "";
    if (c.name.trim().length < 3) return "Enter a name, or clear this row.";
    if (!phoneOk(c.phone)) return "Enter a valid phone number.";
    if (phoneTaken(c.phone) || phoneTaken(lead.phone) && c.phone.trim() === lead.phone.trim()) return "This number is already used.";
    return "";
  });
  const bad = Object.values(errs).some(Boolean) || crewErrs.some(Boolean);

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (bad) return;
    onSave(editing ? { ...f, name: nameLocked ? team.name : f.name } : { ...f, lead, crew });
  };

  return (
    <Shell open={open} onClose={onClose} icon={Users} title={editing ? `Edit ${team.name}` : "Add a pickup team"} labelId="pt-team-title" wide onSubmit={submit}
      text={editing ? "Change where the team works, its vehicle and how many pickups it can do in a day. Add or remove people from the team card." : "A team is a small crew that goes to the customer’s door. Every team needs a lead, and you can add the rest of the crew now or later."}>
      <div className="pt-form">
        <label className="ad-modal-field">
          <span>Team name</span>
          <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Pickup team D" disabled={nameLocked} autoFocus={!editing} />
          {nameLocked ? <small className="pt-hint">Locked, because {team.total} pickup{team.total === 1 ? "" : "s"} already use this name.</small> : <Err show={touched}>{errs.name}</Err>}
        </label>
        <label className="ad-modal-field">
          <span>Service area</span>
          <input value={f.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Surat · Adajan and Vesu" />
          <Err show={touched}>{errs.area}</Err>
        </label>
        <label className="ad-modal-field">
          <span>Vehicle</span>
          <select value={f.vehicle} onChange={(e) => set("vehicle", e.target.value)}>{VEHICLES.map((v) => <option key={v}>{v}</option>)}</select>
        </label>
        <label className="ad-modal-field">
          <span>Pickups per day <em>(capacity)</em></span>
          <input type="number" min="1" max="20" value={f.capacity} onChange={(e) => set("capacity", e.target.value)} />
          <Err show={touched}>{errs.capacity}</Err>
        </label>
        <label className="ad-modal-field pt-wide">
          <span>Notes <em>(optional)</em></span>
          <textarea rows={2} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="What this team is best at, where it starts from" />
        </label>

        {!editing && (
          <>
            <div className="pt-section pt-wide"><Crown size={14} /> Team lead <em>(required)</em></div>
            <label className="ad-modal-field">
              <span>Lead’s name</span>
              <input value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} />
              <Err show={touched}>{errs.leadName}</Err>
            </label>
            <label className="ad-modal-field">
              <span>Lead’s phone</span>
              <input type="tel" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} placeholder="+91 98XXX XXXXX" />
              <Err show={touched}>{errs.leadPhone}</Err>
            </label>

            <div className="pt-section pt-wide"><Users size={14} /> More crew <em>(optional, you can add them later)</em></div>
            {crew.map((c, i) => (
              <div key={i} className="pt-crew-row pt-wide">
                <input aria-label={`Crew member ${i + 1} name`} placeholder="Name" value={c.name} onChange={(e) => setCrew(crew.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <input aria-label={`Crew member ${i + 1} phone`} type="tel" placeholder="Phone" value={c.phone} onChange={(e) => setCrew(crew.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))} />
                <select aria-label={`Crew member ${i + 1} role`} value={c.role} onChange={(e) => setCrew(crew.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}>
                  <option>Driver</option><option>Helper</option>
                </select>
                <Err show={touched}>{crewErrs[i]}</Err>
              </div>
            ))}
            <button type="button" className="pt-add-row pt-wide" onClick={() => setCrew([...crew, { ...blankPerson, role: "Helper" }])}><Plus size={14} /> Add another person</button>
          </>
        )}
      </div>
      <div className="ad-modal-actions">
        <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="ad-btn ad-btn-primary">{editing ? "Save changes" : "Create team"}</button>
      </div>
    </Shell>
  );
}

/* ======================= member: add / edit ======================= */
export function MemberFormModal({ open, team, teams = [], member, onSave, onClose }) {
  const editing = !!member;
  const [teamId, setTeamId] = useState("");
  const [f, setF] = useState({ name: "", phone: "", role: "Driver", status: "Active" });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setTeamId(team?.id || teams[0]?.id || "");
    setF(member ? { name: member.name, phone: member.phone, role: member.role, status: member.status } : { name: "", phone: "", role: "Driver", status: "Active" });
  }, [open, team, member]); // eslint-disable-line react-hooks/exhaustive-deps

  const target = team || teams.find((t) => t.id === teamId);
  const errs = {
    name: f.name.trim().length < 3 ? "Enter the person’s name." : "",
    phone: !phoneOk(f.phone) ? "Enter a valid phone number." : phoneTaken(f.phone, member?.id) ? "This number already belongs to someone on a team." : "",
  };
  const bad = errs.name || errs.phone || !target;
  const currentLead = target?.members.find((m) => m.role === "Lead" && m.id !== member?.id);

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (bad) return;
    onSave(target.id, f);
  };

  return (
    <Shell open={open} onClose={onClose} icon={UserPlus} title={editing ? `Edit ${member.name}` : "Add a team member"} labelId="pt-member-title" onSubmit={submit}
      text={editing ? "Update their details, role or whether they are on duty." : "Add someone to a pickup team. They will show up on the team card straight away."}>
      {!team && !editing && (
        <label className="ad-modal-field">
          <span>Which team?</span>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>{teams.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.area}</option>)}</select>
        </label>
      )}
      {team && <div className="ad-modal-targets"><span>{team.name}</span></div>}
      <label className="ad-modal-field">
        <span>Full name</span>
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        <Err show={touched}>{errs.name}</Err>
      </label>
      <label className="ad-modal-field">
        <span>Phone</span>
        <input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+91 98XXX XXXXX" />
        <Err show={touched}>{errs.phone}</Err>
      </label>
      <div className="ad-modal-field">
        <span>Role</span>
        <div className="pt-roles" role="radiogroup" aria-label="Role">
          {ROLES.map((r) => (
            <button key={r.key} type="button" role="radio" aria-checked={f.role === r.key} className={f.role === r.key ? "on" : ""} onClick={() => setF({ ...f, role: r.key })}>
              <strong>{r.key}</strong><small>{r.blurb}</small>
            </button>
          ))}
        </div>
        {f.role === "Lead" && currentLead && <small className="pt-hint warn"><AlertTriangle size={12} /> {currentLead.name} is the current lead and will become a Driver.</small>}
      </div>
      {editing && (
        <label className="ad-modal-field">
          <span>Status</span>
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option>Active</option><option>On leave</option></select>
        </label>
      )}
      <div className="ad-modal-actions">
        <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="ad-btn ad-btn-primary">{editing ? "Save changes" : "Add to team"}</button>
      </div>
    </Shell>
  );
}

/* ======================= member: move ======================= */
export function MoveMemberModal({ open, team, member, teams = [], onMove, onClose }) {
  const [to, setTo] = useState("");
  useEffect(() => { if (open) setTo(teams.find((t) => t.id !== team?.id)?.id || ""); }, [open, team, teams]);
  if (!open || !member) return null;
  const options = teams.filter((t) => t.id !== team.id);
  const dest = options.find((t) => t.id === to);
  const leadClash = member.role === "Lead" && dest?.members.some((m) => m.role === "Lead");
  const leaves = member.role === "Lead" && team.members.filter((m) => m.role === "Lead").length === 1;
  return (
    <Shell open={open} onClose={onClose} icon={ArrowRightLeft} title={`Move ${member.name}`} labelId="pt-move-title"
      text={`Move ${member.name} out of ${team.name}. Pickups already scheduled stay with the team, not the person.`}
      onSubmit={(e) => { e.preventDefault(); if (dest) onMove(dest.id); }}>
      <label className="ad-modal-field">
        <span>Move to</span>
        <select value={to} onChange={(e) => setTo(e.target.value)}>{options.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.members.length} people</option>)}</select>
      </label>
      {leadClash && <p className="pt-callout warn"><AlertTriangle size={14} /> {dest.name} already has a lead, so {member.name} joins as a Driver.</p>}
      {leaves && <p className="pt-callout warn"><AlertTriangle size={14} /> {team.name} will have no lead after this and stops getting new pickups until you choose one.</p>}
      <div className="ad-modal-actions">
        <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="ad-btn ad-btn-primary" disabled={!dest}>Move person</button>
      </div>
    </Shell>
  );
}

/* ======================= team: pause / resume / remove ======================= */
const PAUSE_CHIPS = ["Vehicle in service", "Short on staff", "Festival break", "Seasonal slowdown"];

export function TeamStatusModal({ open, mode, team, others = [], onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const [moveTo, setMoveTo] = useState("");
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (open) { setReason(""); setMoveTo(others[0]?.name || ""); setTouched(false); } }, [open, team]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open || !team) return null;

  const pending = team.movable.length;
  const pause = mode === "pause";
  const resume = mode === "resume";
  const remove = mode === "remove";
  const needsMove = pending > 0 && (remove || (pause && moveTo));
  const noTarget = pending > 0 && others.length === 0;
  const reasonMissing = pause && reason.trim().length < 5;
  const blocked = remove && noTarget;

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (reasonMissing || blocked) return;
    onConfirm({ reason: reason.trim(), moveTo: needsMove ? moveTo : "" });
  };

  const Icon = pause ? PauseCircle : resume ? PlayCircle : Trash2;
  return (
    <Shell open={open} onClose={onClose} icon={Icon} tone={remove ? "danger" : pause ? "warning" : "positive"} labelId="pt-status-title" onSubmit={submit}
      title={pause ? `Pause ${team.name}?` : resume ? `Resume ${team.name}?` : `Remove ${team.name}?`}
      text={pause ? "A paused team is hidden when you schedule pickups. People stay on the team and can be resumed any time."
        : resume ? "The team can be chosen for new pickups again."
          : "This deletes the team and its people from the list. Past pickups keep the team name for the record."}>
      {resume && team.noLead && <p className="pt-callout warn"><AlertTriangle size={14} /> This team has no active lead, so it still cannot take pickups. Choose a lead on the team card.</p>}

      {pause && (
        <div className="ad-modal-field">
          <span>Reason <em>(only the admin team sees this)</em></span>
          <div className="dn-chips">{PAUSE_CHIPS.map((c) => <button key={c} type="button" className={reason === c ? "on" : ""} onClick={() => setReason(c)}>{c}</button>)}</div>
          <textarea aria-label="Reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Add a short note" autoFocus />
          <Err show={touched && reasonMissing}>Please add a short reason (at least 5 characters).</Err>
        </div>
      )}

      {(pause || remove) && pending > 0 && (
        <div className="pt-callout">
          <strong>{pending} scheduled pickup{pending === 1 ? "" : "s"} {pending === 1 ? "is" : "are"} with this team.</strong>
          {noTarget ? (
            <p>There is no other active team to take {pending === 1 ? "it" : "them"}. {remove ? "Add or resume another team first." : "They stay with this team for now."}</p>
          ) : (
            <label className="ad-modal-field">
              <span>{pause ? "Move them to" : "Move them to (required)"}</span>
              <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                {pause && <option value="">Leave them with {team.name}</option>}
                {others.map((o) => <option key={o.name} value={o.name}>{o.name} · {o.lead?.name}</option>)}
              </select>
              <small className="pt-hint">Date and time slot stay the same. The customer sees the new team’s lead.</small>
            </label>
          )}
        </div>
      )}

      <div className="ad-modal-actions">
        <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className={`ad-btn ${remove ? "ad-btn-danger" : pause ? "ad-btn-warning" : "ad-btn-primary"}`} disabled={blocked}>
          {pause ? "Pause team" : resume ? "Resume team" : "Remove team"}
        </button>
      </div>
    </Shell>
  );
}

/* ======================= member: remove ======================= */
export function RemoveMemberModal({ open, team, member, onConfirm, onClose }) {
  if (!open || !member) return null;
  const onlyLead = member.role === "Lead" && team.members.filter((m) => m.role === "Lead").length === 1;
  return (
    <Shell open={open} onClose={onClose} icon={Trash2} tone="danger" title={`Remove ${member.name}?`} labelId="pt-rm-title"
      text={`${member.name} leaves ${team.name}. Their past pickups are not affected.`}
      onSubmit={(e) => { e.preventDefault(); onConfirm(); }}>
      {onlyLead && <p className="pt-callout warn"><AlertTriangle size={14} /> They are the team’s only lead. Until you make someone else the lead, this team cannot take new pickups.</p>}
      {team.members.length === 1 && <p className="pt-callout warn"><AlertTriangle size={14} /> This is the last person on the team.</p>}
      <div className="ad-modal-actions">
        <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="ad-btn ad-btn-danger">Remove person</button>
      </div>
    </Shell>
  );
}
