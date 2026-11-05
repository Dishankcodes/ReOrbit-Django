import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  BadgeCheck,
  Briefcase,
  Camera,
  Check,
  CircleAlert,
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

import CitySelect from "../../shared/components/CitySelect";
import useMyProfile from "../../shared/hooks/useMyProfile";
import { GUJARAT, GUJARAT_PIN_HINT, mediaUrl, pincodeProblem } from "../../api/profile";

import "../css/ReMakerProfile.css";

/* ---------------------------------------------------------
   The profile lives on the server (ReMakers + ReMaker_Profile).
   skills are saved as "a, b, c" and certifications one per line,
   so the page turns them into lists and back.
   --------------------------------------------------------- */

const SOCIALS = [
  ["instagram", "Instagram"],
  ["website", "Website"],
  ["youtube", "YouTube"],
  ["facebook", "Facebook"],
  ["twitter", "X / Twitter"],
  ["linkedin", "LinkedIn"],
];

const splitList = (text, separator) =>
  (text || "")
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);

function toDraft(account, profile) {
  return {
    fullName: account?.full_name || "",
    username: account?.username || "",
    studioName: profile?.studio_name || "",
    speciality: profile?.speciality || "",
    email: account?.email || "",
    authProvider: account?.auth_provider || "email",
    phone: profile?.phone || "",
    city: profile?.city || "",
    state: GUJARAT,
    pincode: profile?.pincode || "",
    bio: profile?.bio || "",
    skills: splitList(profile?.skills, ","),
    experience: profile?.experience || "",
    certifications: splitList(profile?.certification, "\n"),
    social: { ...(profile?.social_links || {}) },
    avatar: mediaUrl(profile?.profile_image),
    cover: mediaUrl(profile?.cover_image),
  };
}

const toPayload = (d) => ({
  full_name: d.fullName.trim(),
  username: d.username.trim(),
  studio_name: d.studioName.trim(),
  speciality: d.speciality.trim(),
  phone: d.phone.trim(),
  city: d.city.trim(),
  state: GUJARAT,
  pincode: d.pincode.trim(),
  bio: d.bio.trim(),
  skills: d.skills.join(", "),
  experience: d.experience.trim(),
  certification: d.certifications.join("\n"),
  social_links: d.social,
});

/* server field name -> the key this page uses */
const SERVER_FIELD = {
  full_name: "fullName",
  username: "username",
  studio_name: "studioName",
  speciality: "speciality",
  phone: "phone",
  city: "city",
  state: "state",
  pincode: "pincode",
  bio: "bio",
  experience: "experience",
  skills: "skills",
  certification: "certifications",
  social_links: "social",
};

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
  const me = useMyProfile("remaker");
  const saved = useMemo(() => toDraft(me.account, me.profile), [me.account, me.profile]);

  const [draft, setDraft] = useState(saved);
  const [editing, setEditing] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [skillDraft, setSkillDraft] = useState("");
  const [certDraft, setCertDraft] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [toast, setToast] = useState("");

  const fileRef = useRef(null);
  const coverRef = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  };

  const data = editing ? { ...draft, avatar: saved.avatar, cover: saved.cover } : saved;

  const setField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => ({ ...current, [field]: undefined }));
  };

  /* ---------------------------------------------------------
     Validation
     --------------------------------------------------------- */

  const errors = {
    fullName: draft.fullName.trim() ? "" : "Enter your full name.",
    username: draft.username.trim()
      ? ""
      : "Add the username buyers will know you by.",
    phone: /^\+?[0-9][0-9 -]{9,17}$/.test(draft.phone.trim())
      ? ""
      : "Enter a valid phone number.",
    pincode: draft.pincode.trim()
      ? pincodeProblem(draft.pincode)
      : "Enter your 6-digit pincode.",
    city: draft.city.trim() ? "" : "Select your city.",
  };

  const hasErrors = Object.values(errors).some(Boolean);
  const err = (key) =>
    serverErrors[key] || (attempted && errors[key] ? errors[key] : "");

  /* ---------------------------------------------------------
     Actions
     --------------------------------------------------------- */

  const startEdit = () => {
    setDraft(saved);
    setAttempted(false);
    setServerErrors({});
    setAvatarError("");
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setDraft(saved);
    setEditing(false);
    setAttempted(false);
    setServerErrors({});
    setSkillDraft("");
    setCertDraft("");
  };

  const saveEdit = async () => {
    setAttempted(true);

    if (hasErrors) {
      requestAnimationFrame(() =>
        document
          .querySelector('.rpp [aria-invalid="true"]')
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      return;
    }

    const result = await me.save(toPayload(draft));

    if (!result.ok) {
      const mapped = {};
      Object.entries(result.errors || {}).forEach(([field, messages]) => {
        mapped[SERVER_FIELD[field] || field] = Array.isArray(messages)
          ? messages[0]
          : String(messages);
      });
      setServerErrors(mapped);
      setAvatarError(Object.keys(mapped).length ? "" : result.message);
      requestAnimationFrame(() =>
        document
          .querySelector('.rpp [aria-invalid="true"]')
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      return;
    }

    setEditing(false);
    setServerErrors({});
    showToast("Profile saved.");
  };

  /* pictures are uploaded straight away and saved on the server */
  const pickImage = async (kind, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAvatarError("");
    const result = await me.setImage(kind, file);
    if (result.ok) showToast(result.message);
    else setAvatarError(result.message);
  };

  const dropImage = async (kind) => {
    setAvatarError("");
    const result = await me.clearImage(kind);
    if (result.ok) showToast(result.message);
    else setAvatarError(result.message);
  };

  const addTag = (field, value, clear, max) => {
    const text = value.trim().replace(/,$/, "").trim();

    if (!text || draft[field].length >= max) return;

    const exists = draft[field].some(
      (item) => item.toLowerCase() === text.toLowerCase(),
    );

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
  const title = data.studioName || data.username;
  const p = me.profile || {};

  const stats = [
    { icon: Recycle, value: String(p.total_uploads ?? 0), label: "Products listed" },
    {
      icon: Star,
      value: p.rating_count ? Number(p.rating_average).toFixed(1) : "–",
      label: p.rating_count ? `Average rating (${p.rating_count})` : "No ratings yet",
    },
    { icon: Users, value: String(p.total_sales ?? 0), label: "Sales" },
  ];

  const impact = [
    {
      icon: Leaf,
      value: `${Number(p.environmental_impact ?? 0).toLocaleString("en-IN")} kg`,
      label: "Waste kept out of landfill",
    },
    {
      icon: Recycle,
      value: String(p.total_sales ?? 0),
      label: "Pieces given a second life",
    },
  ];

  if (me.loading && !me.account) {
    return (
      <section className="rpp">
        <p className="rpp-empty">Loading your profile…</p>
      </section>
    );
  }

  if (me.error && !me.account) {
    return (
      <section className="rpp">
        <p className="rpp-error inline">
          <CircleAlert size={13} />
          {me.error}
        </p>
        <button type="button" className="rpp-btn primary" onClick={me.reload}>
          Try again
        </button>
      </section>
    );
  }

  return (
    <section className="rpp">
      {/* ======================= HERO ======================= */}
      <header className="rpp-hero">
        <div className="rpp-cover">
          {data.cover && <img className="rpp-cover-img" src={data.cover} alt="" />}
          {!data.cover && <svg aria-hidden="true" viewBox="0 0 1200 220" preserveAspectRatio="xMaxYMid slice">
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
          </svg>}
          {editing && (
            <div className="rpp-cover-actions">
              <button
                type="button"
                className="rpp-cover-btn"
                disabled={me.busy}
                onClick={() => coverRef.current?.click()}
              >
                <Camera size={14} />
                {data.cover ? "Change cover" : "Add cover"}
              </button>
              {data.cover && (
                <button
                  type="button"
                  className="rpp-cover-btn"
                  disabled={me.busy}
                  onClick={() => dropImage("cover")}
                >
                  <X size={14} />
                  Remove
                </button>
              )}
              <input
                ref={coverRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(event) => pickImage("cover", event)}
              />
            </div>
          )}
        </div>

        <div className="rpp-hero-body">
          <div className="rpp-avatar-wrap">
            <div className="rpp-avatar">
              {data.avatar ? (
                <img src={data.avatar} alt={`${title} profile`} />
              ) : (
                <span>{initialsOf(title)}</span>
              )}
            </div>

            {editing && (
              <>
                <button
                  type="button"
                  className="rpp-avatar-btn"
                  disabled={me.busy}
                  onClick={() => fileRef.current?.click()}
                  aria-label="Change profile photo"
                >
                  <Camera size={15} />
                </button>
                {data.avatar && (
                  <button
                    type="button"
                    className="rpp-avatar-btn remove"
                    disabled={me.busy}
                    onClick={() => dropImage("photo")}
                    aria-label="Remove profile photo"
                  >
                    <X size={15} />
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(event) => pickImage("photo", event)}
                />
              </>
            )}
          </div>

          <div className="rpp-identity">
            <div className="rpp-name-row">
              <h2>{title}</h2>
              {me.account?.email_verified_at && (
                <span className="rpp-verified">
                  <BadgeCheck size={14} />
                  Verified ReMaker
                </span>
              )}
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
            <button
              type="button"
              className="rpp-btn primary"
              onClick={startEdit}
            >
              <Pencil size={15} />
              Edit profile
            </button>
          )}
        </div>

        <dl className="rpp-stats">
          {stats.map((stat) => {
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
                <Field id="rpp-user" label="Username" error={err("username")}>
                  {textInput("rpp-user", "username", { maxLength: 100 })}
                </Field>
                <Field id="rpp-studio" label="Studio name" error={err("studioName")}>
                  {textInput("rpp-studio", "studioName", { maxLength: 120 })}
                </Field>
                <Field id="rpp-full" label="Full name" error={err("fullName")}>
                  {textInput("rpp-full", "fullName", { maxLength: 60 })}
                </Field>
                <Field id="rpp-spec" label="Speciality" error={err("speciality")}>
                  {textInput("rpp-spec", "speciality", { maxLength: 150 })}
                </Field>
                <Field id="rpp-bio" label="Bio" span error={err("bio")}>
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
              <>
                {data.speciality && <p className="rpp-sub">{data.speciality}</p>}
                <p className="rpp-bio">{data.bio || "No bio added yet."}</p>
              </>
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
                    onKeyDown={(event) =>
                      tagKey(event, "skills", skillDraft, setSkillDraft, 10)
                    }
                    placeholder="Add a skill and press Enter"
                    aria-label="Add a skill"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      addTag("skills", skillDraft, setSkillDraft, 10)
                    }
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
                  rows={3}
                  maxLength={100}
                  value={draft.experience}
                  onChange={(event) =>
                    setField("experience", event.target.value)
                  }
                  placeholder="Years of experience, in a line (100 characters)."
                />
                {err("experience") && <span className="rpp-error">{err("experience")}</span>}
              </div>
            ) : (
              <p className="rpp-bio">
                {data.experience || "No experience added yet."}
              </p>
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
                  onClick={() =>
                    addTag("certifications", certDraft, setCertDraft, 6)
                  }
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
              {impact.map((item) => {
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
            <h3>Contact</h3>

            {editing ? (
              <div className="rpp-form single">
                <Field id="rpp-phone" label="Phone" error={err("phone")}>
                  {textInput("rpp-phone", "phone", {
                    inputMode: "tel",
                    maxLength: 13,
                  })}
                </Field>
                <div className="rpp-form-pair">
                  <Field id="rpp-city" label="City" error={err("city")}>
                    <CitySelect
                      id="rpp-city"
                      value={draft.city}
                      invalid={Boolean(err("city"))}
                      onChange={(city) => setField("city", city)}
                    />
                  </Field>
                  <Field id="rpp-state" label="State">
                    {textInput("rpp-state", "state", { value: GUJARAT, readOnly: true, disabled: true })}
                  </Field>
                </div>
                <Field id="rpp-pin" label="Pincode" error={err("pincode")}>
                  <span className="rpp-hint">{GUJARAT_PIN_HINT}</span>
                  {textInput("rpp-pin", "pincode", {
                    inputMode: "numeric",
                    maxLength: 6,
                  })}
                </Field>
              </div>
            ) : (
              <ul className="rpp-contact">
                <li>
                  <Phone size={16} />
                  <span>{data.phone || "No phone added yet."}</span>
                </li>
                <li>
                  <MapPin size={16} />
                  <span>
                    {[data.city, data.state]
                      .filter(Boolean)
                      .join(", ")}
                    <small>{data.pincode}</small>
                  </span>
                </li>
              </ul>
            )}
          </section>

          {/* SOCIAL */}
          <section className="rpp-card">
            <h3>Social links</h3>

            {editing ? (
              <div className="rpp-form single">
                {SOCIALS.map(([key, label]) => (
                  <Field
                    key={key}
                    id={`rpp-soc-${key}`}
                    label={label}
                    error={undefined}
                  >
                    <input
                      id={`rpp-soc-${key}`}
                      type="url"
                      inputMode="url"
                      maxLength={300}
                      placeholder="https://"
                      value={draft.social[key] || ""}
                      onChange={(event) =>
                        setField("social", { ...draft.social, [key]: event.target.value })
                      }
                    />
                  </Field>
                ))}
                {serverErrors.social && <span className="rpp-error">{serverErrors.social}</span>}
              </div>
            ) : SOCIALS.some(([key]) => data.social[key]) ? (
              <ul className="rpp-contact">
                {SOCIALS.filter(([key]) => data.social[key]).map(([key, label]) => (
                  <li key={key}>
                    <span>
                      <a href={data.social[key]} target="_blank" rel="noreferrer noopener">
                        {label}
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rpp-empty">No links added yet.</p>
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
                    Signed up with{" "}
                    {data.authProvider === "google" ? "Google" : "email"}. Email
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
        <div
          className="rpp-savebar"
          role="region"
          aria-label="Save profile changes"
        >
          <p>
            {attempted && hasErrors
              ? "Fix the highlighted fields to save."
              : "You are editing your profile."}
          </p>
          <div>
            <button
              type="button"
              className="rpp-btn ghost"
              onClick={cancelEdit}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rpp-btn primary"
              onClick={saveEdit}
            >
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
