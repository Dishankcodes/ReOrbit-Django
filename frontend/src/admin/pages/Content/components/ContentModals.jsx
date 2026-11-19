import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Tags,
  ImagePlus,
  CircleHelp,
  Trash2,
  Rocket,
  History,
  RotateCcw,
  Check,
  AlertTriangle,
  Search,
} from "lucide-react";
import {
  BANNER_PLACEMENTS,
  BANNER_SIDES,
  sideOf,
  BANNER_IMAGES,
  FAQ_TOPICS,
  categoryNameTaken,
} from "../../../data/contentStore";
import { CategoryIcon } from "./contentBits";
import {
  ICON_GROUPS,
  iconLabel,
  suggestIcons,
} from "../../../../shared/categoryIcons";
import BannerCard, { BANNER_RATIO } from "../../../../shared/components/BannerCard";
import { ImageUploader, LinkSuggestions } from "./BannerFormParts";
import { formatDate } from "../../../utils/format";

/* Shared frame: backdrop, Escape to close, scroll lock. */
export function Shell({
  open,
  onClose,
  icon: Icon,
  tone = "positive",
  title,
  text,
  children,
  wide,
  onSubmit,
  labelId,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="ad-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        className={`ad-modal ${wide ? "cm-modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        onSubmit={onSubmit}
        noValidate
      >
        <button
          type="button"
          className="ad-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <div className={`ad-modal-icon tone-${tone}`}>
          <Icon size={22} strokeWidth={1.7} />
        </div>
        <h3 id={labelId}>{title}</h3>
        {text && <p className="ad-modal-text">{text}</p>}
        {children}
      </form>
    </div>
  );
}
const Err = ({ show, children }) =>
  show ? <small className="ad-modal-error">{children}</small> : null;

/* ======================= category icon picker ======================= */
/* Every icon has a visible name on hover / keyboard focus. The picked icon is named next to
   a live preview, "Suggested" follows what the admin types as the name, and there is a search. */
function IconPicker({ value, name, onChange }) {
  const [q, setQ] = useState("");
  const suggested = useMemo(() => suggestIcons(name), [name]);
  const groups = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return ICON_GROUPS;
    return ICON_GROUPS.map((g) => ({
      ...g,
      icons: g.icons.filter((i) => `${i.label} ${i.words} ${g.group}`.toLowerCase().includes(t)),
    })).filter((g) => g.icons.length);
  }, [q]);
  const btn = (i) => (
    <button
      key={i.key}
      type="button"
      role="radio"
      aria-checked={value === i.key}
      aria-label={i.label}
      data-tip={i.label}
      className={value === i.key ? "on" : ""}
      onClick={() => onChange(i.key)}
    >
      <CategoryIcon name={i.key} size={18} />
    </button>
  );
  return (
    <div className="ad-modal-field cm-picker">
      <span>Icon</span>
      <p className="cm-help">
        Members see this icon beside the category on the marketplace, the
        donate page and the home page. Pick the one that shows at a glance
        what belongs here. Hover an icon to see its name.
      </p>
      <div className="cm-picked" aria-live="polite">
        <i>
          <CategoryIcon name={value} size={22} />
        </i>
        <div>
          <strong>{iconLabel(value)}</strong>
          <small>
            {name.trim() ? `Shown next to “${name.trim()}”` : "Your chosen icon"}
          </small>
        </div>
      </div>
      {suggested.length > 0 && !q && (
        <div className="cm-suggest">
          <em>Suggested for this name</em>
          <div className="cm-icons" role="radiogroup" aria-label="Suggested icons">
            {suggested.map(btn)}
          </div>
        </div>
      )}
      <label className="cm-iconsearch">
        <Search size={14} />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search icons: chair, toys, books…"
          aria-label="Search icons"
        />
      </label>
      <div className="cm-iconscroll">
        {groups.length === 0 && (
          <p className="cm-help">No icon matches “{q}”. Try a simpler word.</p>
        )}
        {groups.map((g) => (
          <div key={g.group} className="cm-icongroup">
            <em>{g.group}</em>
            <div className="cm-icons" role="radiogroup" aria-label={g.group}>
              {g.icons.map(btn)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ======================= category ======================= */
export function CategoryModal({ open, category, onSave, onClose }) {
  const editing = !!category;
  const [f, setF] = useState({ name: "", icon: "Package", blurb: "" });
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setF(
      category
        ? { name: category.name, icon: category.icon, blurb: category.blurb }
        : { name: "", icon: "Package", blurb: "" },
    );
  }, [open, category]);

  const nameLocked = editing && (category.inUse || category.locked);
  const err = {
    name:
      f.name.trim().length < 3
        ? "Give the category a name of at least 3 letters."
        : categoryNameTaken(f.name, category?.id)
          ? "A category with this name already exists."
          : "",
    blurb:
      f.blurb.trim().length > 90
        ? "Keep the description under 90 characters."
        : "",
  };
  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (err.name && !nameLocked) return;
    if (err.blurb) return;
    onSave(f);
  };

  return (
    <Shell
      open={open}
      onClose={onClose}
      icon={Tags}
      title={editing ? `Edit ${category.name}` : "Add a category"}
      labelId="cm-cat-title"
      onSubmit={submit}
      text={
        editing
          ? undefined
          : "Members will be able to choose this when they list an item or donate."
      }
    >
      <label className="ad-modal-field">
        <span>Name</span>
        <input
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          disabled={nameLocked}
          placeholder="e.g. Toys and games"
          autoFocus={!editing}
        />
        {nameLocked && (
          <small className="cm-hint">
            {category.locked
              ? "This category is always available, so its name stays."
              : `The name is locked because ${category.total} record${category.total === 1 ? "" : "s"} use it. You can still change the icon and description, or hide it.`}
          </small>
        )}
        <Err show={touched && !nameLocked && err.name}>{err.name}</Err>
      </label>
      <label className="ad-modal-field">
        <span>
          Description <em>(optional)</em>
        </span>
        <input
          value={f.blurb}
          onChange={(e) => setF({ ...f, blurb: e.target.value })}
          placeholder="What belongs here"
        />
        <Err show={touched && err.blurb}>{err.blurb}</Err>
      </label>
      <IconPicker
        value={f.icon}
        name={f.name}
        onChange={(icon) => setF({ ...f, icon })}
      />
      <div className="ad-modal-actions">
        <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="ad-btn ad-btn-primary">
          {editing ? "Save changes" : "Add category"}
        </button>
      </div>
    </Shell>
  );
}

/* ======================= banner ======================= */
export function BannerPreview({ b }) {
  return <BannerCard banner={b} placement={b.placement} preview />;
}

/* Step 1 of a new banner: which side of ReOrbit shows it. The form opens after this choice, with
   the places, audiences, suggested pages and boosted products of that side. */
export function BannerSideModal({ open, onPick, onClose }) {
  return (
    <Shell
      open={open}
      onClose={onClose}
      icon={ImagePlus}
      title="Where should this banner show?"
      labelId="cm-bn-side-title"
      onSubmit={(e) => e.preventDefault()}
      text="Pick a side first. A banner shows on one side only, so members and ReMakers each see banners meant for them."
    >
      <div className="cm-side-pick" role="list">
        {BANNER_SIDES.map((x) => (
          <button key={x.key} type="button" role="listitem" className="cm-side-opt" onClick={() => onPick(x.key)}>
            <strong>{x.label}</strong>
            <span>{x.blurb}</span>
          </button>
        ))}
      </div>
    </Shell>
  );
}

export function BannerModal({ open, banner, side: newSide = "user", onSave, onClose, onChangeSide }) {
  const editing = !!banner;
  const blank = {
    title: "",
    subtitle: "",
    cta: newSide === "remaker" ? "Explore" : "Shop now",
    link: newSide === "remaker" ? "/remaker-marketplace" : "/discover-marketplace",
    side: newSide,
    placement: "Home hero",
    audience: "Everyone",
    image: "",
    start: "",
    end: "",
  };
  const [f, setF] = useState(blank);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setTouched(false);
      setF(
        banner
          ? {
              title: banner.title,
              subtitle: banner.subtitle,
              cta: banner.cta,
              link: banner.link,
              side: banner.side || "user",
              placement: banner.placement,
              audience: banner.audience,
              image: banner.image,
              start: banner.start,
              end: banner.end,
            }
          : blank,
      );
    }
  }, [open, banner, newSide]); // eslint-disable-line react-hooks/exhaustive-deps
  const place = BANNER_PLACEMENTS.find((p) => p.key === f.placement);
  const sideInfo = sideOf(f.side);
  const err = {
    title:
      f.title.trim().length < 4
        ? "Write a headline of at least 4 letters."
        : f.title.trim().length > 60
          ? "Keep the headline under 60 characters."
          : "",
    subtitle:
      f.subtitle.length > 110 ? "Keep the line under 110 characters." : "",
    cta:
      f.cta.trim().length > 20
        ? "Keep the button text under 20 characters."
        : "",
    link: !/^(\/|https?:\/\/)/.test(f.link.trim())
      ? "Start the link with / (inside ReOrbit) or https://."
      : "",
    end:
      f.start && f.end && f.end < f.start
        ? "The end date must be after the start date."
        : "",
  };
  err.image = f.image ? "" : "Add a picture for the banner.";
  const bad = Object.values(err).some(Boolean);
  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!bad) onSave(f);
  };
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }));

  return (
    <Shell
      open={open}
      onClose={onClose}
      wide
      icon={ImagePlus}
      title={editing ? "Edit banner" : "Create a banner"}
      labelId="cm-bn-title"
      onSubmit={submit}
      text="Banners start as drafts. Publish one when you are happy with it. If you set dates, it goes live and ends on its own."
    >
      <div className="cm-bnprev">
        <span className="cm-bnprev-h">Preview · how it looks on the site</span>
        <BannerPreview b={f} />
        <p className="cm-hint cm-ratio">
          {sideInfo.label} · “{f.placement}”, best at {place?.ratio} ratio. {sideInfo.places[f.placement]}
        </p>
      </div>
      <div className="cm-side-now">
        <span>
          Shows on the <b>{sideInfo.label}</b>: {sideInfo.blurb}
        </span>
        {!editing && onChangeSide && (
          <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={onChangeSide}>
            Change side
          </button>
        )}
      </div>
      <div className="cm-form">
        <label className="ad-modal-field cm-wide">
          <span>Headline</span>
          <input
            value={f.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Diwali Green Sale"
            autoFocus={!editing}
          />
          <Err show={touched && err.title}>{err.title}</Err>
        </label>
        <label className="ad-modal-field cm-wide">
          <span>
            Supporting line <em>(optional)</em>
          </span>
          <input
            value={f.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
            placeholder="One short sentence"
          />
          <Err show={touched && err.subtitle}>{err.subtitle}</Err>
        </label>
        <label className="ad-modal-field">
          <span>Button text</span>
          <input value={f.cta} onChange={(e) => set("cta", e.target.value)} />
          <Err show={touched && err.cta}>{err.cta}</Err>
        </label>
        <label className="ad-modal-field">
          <span>Button links to</span>
          <input
            value={f.link}
            onChange={(e) => set("link", e.target.value)}
            placeholder="/discover-marketplace"
          />
          <Err show={touched && err.link}>{err.link}</Err>
        </label>
        <div className="cm-wide">
          <LinkSuggestions
            side={f.side}
            audience={f.audience}
            current={f.link.trim()}
            onPick={(to, label) =>
              setF((c) => ({
                ...c,
                link: to,
                cta:
                  label === "Buy now" || !c.cta.trim() || c.cta === "Shop now"
                    ? label.length <= 20
                      ? label
                      : "Shop now"
                    : c.cta,
              }))
            }
          />
        </div>
        <label className="ad-modal-field">
          <span>Where it shows</span>
          <select
            value={f.placement}
            onChange={(e) => set("placement", e.target.value)}
          >
            {BANNER_PLACEMENTS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.key}
              </option>
            ))}
          </select>
          <small className="cm-hint">{sideInfo.places[f.placement]}</small>
        </label>
        <label className="ad-modal-field">
          <span>Who sees it</span>
          <select
            value={f.audience}
            onChange={(e) => set("audience", e.target.value)}
          >
            {sideInfo.audiences.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="ad-modal-field">
          <span>
            Starts on <em>(optional)</em>
          </span>
          <input
            type="date"
            value={f.start}
            onChange={(e) => set("start", e.target.value)}
          />
        </label>
        <label className="ad-modal-field">
          <span>
            Ends on <em>(optional)</em>
          </span>
          <input
            type="date"
            value={f.end}
            min={f.start || undefined}
            onChange={(e) => set("end", e.target.value)}
          />
          <Err show={touched && err.end}>{err.end}</Err>
        </label>
      </div>
      <div className="ad-modal-field">
        <span>Picture</span>
        <ImageUploader
          value={f.image}
          ratio={BANNER_RATIO[f.placement] || "16 / 6"}
          onChange={(u) => set("image", u)}
        />
        <Err show={touched && err.image}>{err.image}</Err>
        <small className="cm-hint">Or pick a sample picture:</small>
        <div className="cm-images" role="radiogroup" aria-label="Sample pictures">
          {BANNER_IMAGES.map((im) => (
            <button
              key={im.src}
              type="button"
              role="radio"
              aria-checked={f.image === im.src}
              aria-label={im.label}
              className={f.image === im.src ? "on" : ""}
              onClick={() => set("image", im.src)}
            >
              <img src={im.src} alt="" />
              {f.image === im.src && (
                <span>
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="ad-modal-actions">
        <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="ad-btn ad-btn-primary">
          {editing ? "Save banner" : "Create draft"}
        </button>
      </div>
    </Shell>
  );
}

/* ======================= FAQ ======================= */
export function FaqModal({ open, faq, defaultTopic, onSave, onClose }) {
  const editing = !!faq;
  const [f, setF] = useState({ topic: FAQ_TOPICS[0], q: "", a: "" });
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setTouched(false);
      setF(
        faq
          ? { topic: faq.topic, q: faq.q, a: faq.a }
          : { topic: defaultTopic || FAQ_TOPICS[0], q: "", a: "" },
      );
    }
  }, [open, faq, defaultTopic]);
  const err = {
    q:
      f.q.trim().length < 8
        ? "Write the question in at least 8 characters."
        : "",
    a:
      f.a.trim().length < 20
        ? "Give a clear answer of at least 20 characters."
        : "",
  };
  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (err.q || err.a) return;
    onSave(f);
  };
  return (
    <Shell
      open={open}
      onClose={onClose}
      icon={CircleHelp}
      title={editing ? "Edit question" : "Add a question"}
      labelId="cm-faq-title"
      onSubmit={submit}
      text="Write it the way a member would ask it, and answer in plain language. You can use values such as {platform_fee}, which stay up to date with Settings."
    >
      <label className="ad-modal-field">
        <span>Topic</span>
        <select
          value={f.topic}
          onChange={(e) => setF({ ...f, topic: e.target.value })}
        >
          {FAQ_TOPICS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="ad-modal-field">
        <span>Question</span>
        <input
          value={f.q}
          onChange={(e) => setF({ ...f, q: e.target.value })}
          placeholder="e.g. Is pickup really free?"
          autoFocus={!editing}
        />
        <Err show={touched && err.q}>{err.q}</Err>
      </label>
      <label className="ad-modal-field">
        <span>Answer</span>
        <textarea
          rows={5}
          value={f.a}
          onChange={(e) => setF({ ...f, a: e.target.value })}
        />
        <Err show={touched && err.a}>{err.a}</Err>
      </label>
      <div className="ad-modal-actions">
        <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="ad-btn ad-btn-primary">
          {editing ? "Save question" : "Add question"}
        </button>
      </div>
    </Shell>
  );
}

/* ======================= confirm (delete / unpublish / discard) ======================= */
export function ConfirmModal({
  open,
  tone = "danger",
  icon: Icon = Trash2,
  title,
  text,
  confirmLabel,
  onConfirm,
  onClose,
  children,
}) {
  const submit = (e) => {
    e.preventDefault();
    onConfirm();
  };
  return (
    <Shell
      open={open}
      onClose={onClose}
      icon={Icon}
      tone={tone}
      title={title}
      text={text}
      labelId="cm-confirm-title"
      onSubmit={submit}
    >
      {children}
      <div className="ad-modal-actions">
        <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="submit"
          className={`ad-btn ad-btn-${tone === "positive" ? "primary" : tone}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Shell>
  );
}

/* ======================= policy: publish ======================= */
export function PublishModal({
  open,
  policy,
  nextVersion,
  onPublish,
  onClose,
}) {
  const [note, setNote] = useState("");
  const [major, setMajor] = useState(false);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setNote("");
      setMajor(false);
      setTouched(false);
    }
  }, [open]);
  if (!policy) return null;
  const first = policy.neverPublished;
  const missing = note.trim().length < 5;
  const [a, b] = String(policy.version).split(".").map(Number);
  const target = first ? "1.0" : major ? `${a + 1}.0` : `${a}.${b + 1}`;
  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!first && missing) return;
    onPublish({ note: note.trim(), major });
  };
  return (
    <Shell
      open={open}
      onClose={onClose}
      icon={Rocket}
      title={first ? `Publish ${policy.title}?` : `Publish version ${target}?`}
      labelId="cm-pub-title"
      onSubmit={submit}
      text="Members will see the new text straight away. The version it replaces is kept in the history, so you can always go back."
    >
      {!first && (
        <>
          <label className="ad-modal-field">
            <span>
              What changed? <em>(kept in the history)</em>
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Return window is now 10 days"
              autoFocus
            />
            <Err show={touched && missing}>
              Add a short note (at least 5 characters).
            </Err>
          </label>
          <label className="cm-check">
            <input
              type="checkbox"
              checked={major}
              onChange={(e) => setMajor(e.target.checked)}
            />
            <span>
              This is a major change that members should read again{" "}
              <em>(version {target}; everyone gets a notification with a link to read it)</em>
            </span>
          </label>
        </>
      )}
      <div className="ad-modal-actions">
        <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="ad-btn ad-btn-primary">
          Publish {first ? "" : `v${target}`}
        </button>
      </div>
    </Shell>
  );
}

/* ======================= policy: history ======================= */
export function HistoryModal({ open, policy, canEdit, onRestore, onClose }) {
  const [sel, setSel] = useState(null);
  useEffect(() => {
    if (open) setSel(null);
  }, [open]);
  if (!policy) return null;
  const chosen = policy.versions.find((v) => v.v === sel);
  return (
    <Shell
      open={open}
      onClose={onClose}
      wide
      icon={History}
      tone="positive"
      title={`${policy.title}: history`}
      labelId="cm-hist-title"
      onSubmit={(e) => e.preventDefault()}
      text="Every published version is kept. Restoring one publishes it again as a new version."
    >
      {policy.versions.length === 0 ? (
        <p className="cm-hint">Nothing has been published yet.</p>
      ) : (
        <div className="cm-hist">
          <ul>
            {policy.versions.map((v, i) => (
              <li key={v.v}>
                <button
                  type="button"
                  className={sel === v.v ? "on" : ""}
                  onClick={() => setSel(v.v)}
                >
                  <strong>
                    Version {v.v}
                    {i === 0 && <em> · current</em>}
                  </strong>
                  <small>
                    {formatDate(v.at)} · {v.by}
                  </small>
                  {v.note && <span>{v.note}</span>}
                </button>
              </li>
            ))}
          </ul>
          <div className="cm-hist-view">
            {chosen ? (
              <>
                <pre>{chosen.body}</pre>
                {canEdit && chosen.v !== policy.version && (
                  <button
                    type="button"
                    className="ad-btn ad-btn-ghost ad-btn-sm"
                    onClick={() => onRestore(chosen.v)}
                  >
                    <RotateCcw size={14} /> Restore this version
                  </button>
                )}
              </>
            ) : (
              <p className="cm-hint">Choose a version to read it.</p>
            )}
          </div>
        </div>
      )}
      <div className="ad-modal-actions">
        <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </Shell>
  );
}

export { AlertTriangle };
