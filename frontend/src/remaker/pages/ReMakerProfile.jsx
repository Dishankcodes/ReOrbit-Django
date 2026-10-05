import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  BadgeCheck,
  Briefcase,
  Camera,
  Check,
  CircleAlert,
  Droplets,
  Leaf,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Recycle,
  ShieldCheck,
  Star,
  Users,
  X,
} from "lucide-react";

import "../css/ReMakerProfile.css";

/* ---------------------------------------------------------
   Starting values. Name and email come from the logged-in
   ReMaker when available, the rest is placeholder UI data.
   --------------------------------------------------------- */

function readStoredReMaker() {
  try {
    return JSON.parse(localStorage.getItem("reorbit_remaker") || "null") || {};
  } catch {
    return {};
  }
}

function buildInitial() {
  const stored = readStoredReMaker();

  return {
    fullName: stored.full_name || stored.fullName || stored.name || "Nivya",
    artName: stored.username || "Messy Mirror",
    email: stored.email || "hello@messymirror.in",
    authProvider: stored.auth_provider || "email",
    phone: "98765 43210",
    address: "14, Craft Lane, Near Old Market",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380015",
    bio: "I turn broken mirrors, old window frames and tired furniture into pieces people want to keep. Every product starts as someone else's discard, and I try to leave a little of its first life visible.",
    skills: ["Furniture restoration", "Mirror framing", "Wood finishing", "Metal work"],
    experience:
      "6 years restoring and upcycling furniture. Started in a small garage workshop, now working with local carpenters on larger commissions.",
    certifications: [
      "Certified Furniture Restorer, NID Short Course",
      "Sustainable Design Practices, 2024",
    ],
    avatar: "",
  };
}

const STATS = [
  { icon: Recycle, value: "38", label: "Products listed" },
  { icon: Star, value: "4.9", label: "Average rating" },
  { icon: Users, value: "2,846", label: "Followers" },
];

const IMPACT = [
  { icon: Leaf, value: "412 kg", label: "Waste kept out of landfill" },
  { icon: Droplets, value: "1,860 L", label: "Water saved vs. new" },
  { icon: Recycle, value: "126", label: "Pieces given a second life" },
];

function initialsOf(name) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "RM";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/* Defined outside the page so inputs keep focus while typing */
function Field({ id, label, children, error, span }) {
  return (
    <div className={`rpp-field ${span ? "span-2" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <span className="rpp-error">{error}</span>}
    </div>
  );
}

export default function ReMakerProfile() {
  const initial = useMemo(() => buildInitial(), []);

  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [skillDraft, setSkillDraft] = useState("");
  const [certDraft, setCertDraft] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [toast, setToast] = useState("");

  const fileRef = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const data = editing ? draft : saved;

  const setField = (field, value) =>
    setDraft((current) => ({ ...current, [field]: value }));

  /* ---------------------------------------------------------
     Validation
     --------------------------------------------------------- */

  const errors = {
    fullName: draft.fullName.trim() ? "" : "Enter your full name.",
    artName: draft.artName.trim() ? "" : "Add the name buyers will know you by.",
    phone: /^[0-9 ]{10,13}$/.test(draft.phone.trim()) ? "" : "Enter a valid 10-digit phone number.",
    pincode: /^[0-9]{6}$/.test(draft.pincode.trim()) ? "" : "Pincode must be 6 digits.",
    city: draft.city.trim() ? "" : "Enter your city.",
    state: draft.state.trim() ? "" : "Enter your state.",
  };

  const hasErrors = Object.values(errors).some(Boolean);
  const err = (key) => (attempted && errors[key] ? errors[key] : "");

  /* ---------------------------------------------------------
     Actions
     --------------------------------------------------------- */

  const startEdit = () => {
    setDraft(saved);
    setAttempted(false);
    setAvatarError("");
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    if (draft.avatar && draft.avatar !== saved.avatar && draft.avatar.startsWith("blob:")) {
      URL.revokeObjectURL(draft.avatar);
    }

    setDraft(saved);
    setEditing(false);
    setAttempted(false);
    setSkillDraft("");
    setCertDraft("");
  };

  const saveEdit = () => {
    setAttempted(true);

    if (hasErrors) {
      requestAnimationFrame(() =>
        document
          .querySelector('.rpp [aria-invalid="true"]')
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      return;
    }

    setSaved(draft);
    setEditing(false);
    setToast("Profile saved.");
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  };

  const handleAvatar = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Choose an image file (JPG, PNG or WebP).");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setAvatarError("Photo must be under 3 MB.");
      return;
    }

    setAvatarError("");
    setField("avatar", URL.createObjectURL(file));
  };

  const addTag = (field, value, clear, max) => {
    const text = value.trim().replace(/,$/, "").trim();

    if (!text || draft[field].length >= max) return;

    const exists = draft[field].some((item) => item.toLowerCase() === text.toLowerCase());

    if (!exists) setField(field, [...draft[field], text]);

    clear("");
  };

  const tagKey = (event, field, value, clear, max) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(field, value, clear, max);
    }
  };

  const removeTag = (field, value) =>
    setField(
      field,
      draft[field].filter((item) => item !== value),
    );

  /* ---------------------------------------------------------
     Render helpers
     --------------------------------------------------------- */

  const textInput = (id, key, props = {}) => (
    <input
      id={id}
      type="text"
      value={draft[key]}
      onChange={(event) => setField(key, event.target.value)}
      aria-invalid={err(key) ? "true" : undefined}
      {...props}
    />
  );

  const location = [data.city, data.state].filter(Boolean).join(", ");

  return (
    <section className="rpp">
      {/* ======================= HERO ======================= */}
      <header className="rpp-hero">
        <div className="rpp-cover" aria-hidden="true">
          <svg viewBox="0 0 1200 220" preserveAspectRatio="xMaxYMid slice">
            <g fill="none" stroke="currentColor" strokeWidth="1.2">
              <circle cx="1010" cy="110" r="70" />
              <circle cx="1010" cy="110" r="125" />
              <circle cx="1010" cy="110" r="185" />
              <circle cx="1010" cy="110" r="250" />
              <circle cx="1010" cy="110" r="320" />
            </g>
            <circle cx="1080" cy="64" r="7" fill="#c1c8c4" />
            <circle cx="890" cy="152" r="5" fill="#c1c8c4" opacity="0.7" />
            <circle cx="1200" cy="190" r="9" fill="#c1c8c4" opacity="0.5" />
          </svg>
        </div>

        <div className="rpp-hero-body">
          <div className="rpp-avatar-wrap">
            <div className="rpp-avatar">
              {data.avatar ? (
                <img src={data.avatar} alt={`${data.artName} profile`} />
              ) : (
                <span>{initialsOf(data.artName)}</span>
              )}
            </div>

            {editing && (
              <>
                <button
                  type="button"
                  className="rpp-avatar-btn"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Change profile photo"
                >
                  <Camera size={15} />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleAvatar}
                />
              </>
            )}
          </div>

          <div className="rpp-identity">
            <div className="rpp-name-row">
              <h2>{data.artName}</h2>
              <span className="rpp-verified">
                <BadgeCheck size={14} />
                Verified ReMaker
              </span>
            </div>

            <p className="rpp-sub">
              {data.fullName}
              {location && (
                <>
                  <span className="rpp-sep" aria-hidden="true" />
                  <MapPin size={14} />
                  {location}
                </>
              )}
            </p>

            {avatarError && (
              <p className="rpp-error inline">
                <CircleAlert size={13} />
                {avatarError}
              </p>
            )}
          </div>

          {!editing && (
            <button type="button" className="rpp-btn primary" onClick={startEdit}>
              <Pencil size={15} />
              Edit profile
            </button>
          )}
        </div>

        <dl className="rpp-stats">
          {STATS.map((stat) => {
            const Icon = stat.icon;

            return (
              <div key={stat.label}>
                <Icon size={18} />
                <dd>{stat.value}</dd>
                <dt>{stat.label}</dt>
              </div>
            );
          })}
        </dl>
      </header>

      {/* ======================= BODY ======================= */}
      <div className="rpp-grid">
        <div className="rpp-col">
          {/* ABOUT */}
          <section className="rpp-card">
            <h3>About</h3>

            {editing ? (
              <div className="rpp-form">
                <Field id="rpp-art" label="Studio name" error={err("artName")}>
                  {textInput("rpp-art", "artName", { maxLength: 40 })}
                </Field>
                <Field id="rpp-full" label="Full name" error={err("fullName")}>
                  {textInput("rpp-full", "fullName", { maxLength: 60 })}
                </Field>
                <Field id="rpp-bio" label="Bio" span>
                  <textarea
                    id="rpp-bio"
                    rows={5}
                    maxLength={400}
                    value={draft.bio}
                    onChange={(event) => setField("bio", event.target.value)}
                    placeholder="Tell buyers who you are and what you make."
                  />
                  <span className="rpp-hint">{draft.bio.length}/400</span>
                </Field>
              </div>
            ) : (
              <p className="rpp-bio">{data.bio}</p>
            )}
          </section>

          {/* SKILLS */}
          <section className="rpp-card">
            <h3>Skills</h3>

            {editing ? (
              <div className="rpp-tags-edit">
                <div className="rpp-tags">
                  {draft.skills.map((skill) => (
                    <span className="rpp-tag" key={skill}>
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeTag("skills", skill)}
                        aria-label={`Remove ${skill}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="rpp-add-row">
                  <input
                    type="text"
                    value={skillDraft}
                    onChange={(event) => setSkillDraft(event.target.value)}
                    onKeyDown={(event) => tagKey(event, "skills", skillDraft, setSkillDraft, 10)}
                    placeholder="Add a skill and press Enter"
                    aria-label="Add a skill"
                  />
                  <button
                    type="button"
                    onClick={() => addTag("skills", skillDraft, setSkillDraft, 10)}
                    aria-label="Add skill"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ) : data.skills.length ? (
              <div className="rpp-tags">
                {data.skills.map((skill) => (
                  <span className="rpp-tag" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="rpp-empty">No skills added yet.</p>
            )}
          </section>

          {/* EXPERIENCE */}
          <section className="rpp-card">
            <h3>
              <Briefcase size={17} />
              Experience
            </h3>

            {editing ? (
              <div className="rpp-field">
                <label htmlFor="rpp-exp" className="sr-only">
                  Experience
                </label>
                <textarea
                  id="rpp-exp"
                  rows={4}
                  maxLength={400}
                  value={draft.experience}
                  onChange={(event) => setField("experience", event.target.value)}
                  placeholder="Years of experience, workshops, notable projects."
                />
              </div>
            ) : (
              <p className="rpp-bio">{data.experience || "No experience added yet."}</p>
            )}
          </section>

          {/* CERTIFICATIONS */}
          <section className="rpp-card">
            <h3>
              <Award size={17} />
              Certifications
            </h3>

            {data.certifications.length > 0 && (
              <ul className="rpp-certs">
                {data.certifications.map((cert) => (
                  <li key={cert}>
                    <ShieldCheck size={16} />
                    <span>{cert}</span>
                    {editing && (
                      <button
                        type="button"
                        onClick={() => removeTag("certifications", cert)}
                        aria-label={`Remove ${cert}`}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {!editing && data.certifications.length === 0 && (
              <p className="rpp-empty">No certifications added yet.</p>
            )}

            {editing && (
              <div className="rpp-add-row">
                <input
                  type="text"
                  value={certDraft}
                  onChange={(event) => setCertDraft(event.target.value)}
                  onKeyDown={(event) =>
                    tagKey(event, "certifications", certDraft, setCertDraft, 6)
                  }
                  placeholder="Add a certification and press Enter"
                  aria-label="Add a certification"
                />
                <button
                  type="button"
                  onClick={() => addTag("certifications", certDraft, setCertDraft, 6)}
                  aria-label="Add certification"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
          </section>
        </div>

        {/* ======================= SIDE ======================= */}
        <div className="rpp-col">
          {/* IMPACT */}
          <section className="rpp-card rpp-impact">
            <h3>Environmental impact</h3>
            <p className="rpp-card-note">What your work has saved so far.</p>

            <ul>
              {IMPACT.map((item) => {
                const Icon = item.icon;

                return (
                  <li key={item.label}>
                    <span className="rpp-impact-icon">
                      <Icon size={18} />
                    </span>
                    <div>
                      <strong>{item.value}</strong>
                      <small>{item.label}</small>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* CONTACT */}
          <section className="rpp-card">
            <h3>Contact and address</h3>

            {editing ? (
              <div className="rpp-form single">
                <Field id="rpp-phone" label="Phone" error={err("phone")}>
                  {textInput("rpp-phone", "phone", { inputMode: "tel", maxLength: 13 })}
                </Field>
                <Field id="rpp-address" label="Address">
                  {textInput("rpp-address", "address", { maxLength: 120 })}
                </Field>
                <div className="rpp-form-pair">
                  <Field id="rpp-city" label="City" error={err("city")}>
                    {textInput("rpp-city", "city")}
                  </Field>
                  <Field id="rpp-state" label="State" error={err("state")}>
                    {textInput("rpp-state", "state")}
                  </Field>
                </div>
                <Field id="rpp-pin" label="Pincode" error={err("pincode")}>
                  {textInput("rpp-pin", "pincode", { inputMode: "numeric", maxLength: 6 })}
                </Field>
              </div>
            ) : (
              <ul className="rpp-contact">
                <li>
                  <Phone size={16} />
                  <span>{data.phone}</span>
                </li>
                <li>
                  <MapPin size={16} />
                  <span>
                    {[data.address, data.city, data.state].filter(Boolean).join(", ")}
                    <small>{data.pincode}</small>
                  </span>
                </li>
              </ul>
            )}
          </section>

          {/* ACCOUNT */}
          <section className="rpp-card">
            <h3>Account</h3>

            <ul className="rpp-contact">
              <li>
                <Mail size={16} />
                <span>
                  {data.email}
                  <small>
                    Signed up with {data.authProvider === "google" ? "Google" : "email"}. Email
                    can&apos;t be changed here.
                  </small>
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>

      {/* ======================= SAVE BAR ======================= */}
      {editing && (
        <div className="rpp-savebar" role="region" aria-label="Save profile changes">
          <p>
            {attempted && hasErrors
              ? "Fix the highlighted fields to save."
              : "You are editing your profile."}
          </p>
          <div>
            <button type="button" className="rpp-btn ghost" onClick={cancelEdit}>
              Cancel
            </button>
            <button type="button" className="rpp-btn primary" onClick={saveEdit}>
              Save changes
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="rpp-toast" role="status" aria-live="polite">
          <Check size={16} />
          {toast}
        </div>
      )}
    </section>
  );
}
