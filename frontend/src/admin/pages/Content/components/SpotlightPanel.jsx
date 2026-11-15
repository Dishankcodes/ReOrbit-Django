import React, { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Search,
  X,
  Plus,
  Check,
  ImageOff,
  ChevronUp,
  ChevronDown,
  Users,
  Hammer,
  Loader2,
  Wand2,
} from "lucide-react";
import {
  useSpotlight,
  saveSpotlight,
  searchSpotlight,
} from "../../../data/contentStore";
import { formatINR } from "../../../utils/format";

const SURFACES = [
  {
    key: "user",
    title: "Member & visitor Home",
    blurb: "The 3 stacked product cards in the Home hero.",
    Icon: Users,
  },
  {
    key: "remaker",
    title: "ReMaker Home",
    blurb: "The 3 photos in the ReMaker Home hero.",
    Icon: Hammer,
  },
];

/* what kind of product a card is, shown as a small label */
const KIND = { user: "Pre-loved", remaker: "ReMaker", admin: "ReOrbit" };

function Thumb({ src, size = "md" }) {
  return (
    <span className={`cm-sp-thumb ${size}`}>
      {src ? <img src={src} alt="" /> : <ImageOff size={18} aria-hidden="true" />}
    </span>
  );
}

function Meta({ p }) {
  const bits = [p.seller || p.category, p.price ? formatINR(p.price) : ""].filter(Boolean);
  return (
    <span className="cm-sp-meta">
      <strong title={p.title}>{p.title}</strong>
      <small>
        {bits.join(" · ")}
        {p.kind && KIND[p.kind] && <em className={`cm-sp-kind ${p.kind}`}>{KIND[p.kind]}</em>}
      </small>
    </span>
  );
}

function Surface({ s, picks, max, canEdit, toast }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState([]);
  const [state, setState] = useState("idle"); // idle | searching | done
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const ids = picks.map((p) => p.id);
  const full = picks.length >= max;
  const term = q.trim();

  useEffect(() => {
    if (!canEdit || term.length < 2) {
      setFound([]);
      setState("idle");
      return undefined;
    }
    let live = true;
    setState("searching");
    const t = setTimeout(() => {
      searchSpotlight(term)
        .then((r) => {
          if (!live) return;
          setFound(r);
          setState("done");
        })
        .catch(() => {
          if (!live) return;
          setFound([]);
          setState("done");
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [term, canEdit]);

  const commit = async (next, okMsg) => {
    setBusy(true);
    try {
      await saveSpotlight(s.key, next);
      toast(okMsg);
    } catch (e) {
      toast(
        e?.errors
          ? Object.values(e.errors).flat()[0]
          : e?.message || "That did not save.",
      );
    } finally {
      setBusy(false);
    }
  };

  const move = (i, step) => {
    const next = [...ids];
    const j = i + step;
    [next[i], next[j]] = [next[j], next[i]];
    commit(next, `${picks[i].title} moved to spot ${j + 1}.`);
  };

  const boost = (p) => {
    setQ("");
    commit([...ids, p.id], `${p.title} is boosted.`);
  };

  return (
    <article className="cm-sp-card" aria-label={s.title}>
      <header className="cm-sp-card-head">
        <span className="cm-sp-card-icon" aria-hidden="true">
          <s.Icon size={17} />
        </span>
        <div>
          <h4>{s.title}</h4>
          <p>{s.blurb}</p>
        </div>
        <span className={`cm-sp-count ${full ? "full" : ""}`} aria-label={`${picks.length} of ${max} spots boosted`}>
          {picks.length}/{max}
        </span>
      </header>

      <ol className="cm-sp-slots">
        {Array.from({ length: max }, (_, i) => {
          const p = picks[i];
          return (
            <li key={i} className={`cm-sp-slot ${p ? "full" : "empty"} ${busy ? "busy" : ""}`}>
              <span className="cm-sp-n">{i + 1}</span>
              {p ? (
                <>
                  <Thumb src={p.cover} />
                  <Meta p={p} />
                  {p.soldOut && <span className="cm-sp-flag">Sold out</span>}
                  {canEdit && (
                    <span className="cm-sp-actions">
                      <button
                        type="button"
                        aria-label={`Move ${p.title} up`}
                        disabled={busy || i === 0}
                        onClick={() => move(i, -1)}
                      >
                        <ChevronUp size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${p.title} down`}
                        disabled={busy || i === picks.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        <ChevronDown size={15} />
                      </button>
                      <button
                        type="button"
                        className="remove"
                        aria-label={`Remove ${p.title}`}
                        disabled={busy}
                        onClick={() =>
                          commit(
                            ids.filter((x) => x !== p.id),
                            `${p.title} was removed from the hero.`,
                          )
                        }
                      >
                        <X size={15} />
                      </button>
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="cm-sp-thumb md auto" aria-hidden="true">
                    <Wand2 size={17} />
                  </span>
                  <span className="cm-sp-meta">
                    <strong>Filled automatically</strong>
                    <small>The newest product takes this spot</small>
                  </span>
                  {canEdit && !full && (
                    <button
                      type="button"
                      className="cm-sp-pick"
                      onClick={() => input.current?.focus()}
                    >
                      <Plus size={13} /> Pick one
                    </button>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>

      {canEdit && (
        <div className="cm-sp-finder">
          {full ? (
            <p className="cm-sp-full">
              <Check size={14} aria-hidden="true" /> All {max} spots are boosted. Remove one to boost another.
            </p>
          ) : (
            <>
              <label className="cm-sp-search">
                <Search size={15} aria-hidden="true" />
                <input
                  ref={input}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setQ("")}
                  placeholder="Search a product to boost"
                  aria-label={`Search a product to boost on ${s.title}`}
                />
                {state === "searching" && <Loader2 size={15} className="cm-sp-spin" aria-hidden="true" />}
                {q && state !== "searching" && (
                  <button type="button" aria-label="Clear search" onClick={() => setQ("")}>
                    <X size={14} />
                  </button>
                )}
              </label>

              <div role="status" aria-live="polite">
                {term.length > 0 && term.length < 2 && (
                  <p className="cm-sp-note">Type at least 2 letters to search.</p>
                )}
                {state === "done" && found.length === 0 && (
                  <p className="cm-sp-note">No live products match “{term}”.</p>
                )}
              </div>

              {found.length > 0 && (
                <ul className="cm-sp-results">
                  {found.map((p) => {
                    const added = ids.includes(p.id);
                    return (
                      <li key={p.id}>
                        <Thumb src={p.cover} size="sm" />
                        <Meta p={p} />
                        <button
                          type="button"
                          className={`cm-sp-boost ${added ? "added" : ""}`}
                          disabled={busy || added}
                          onClick={() => boost(p)}
                        >
                          {added ? <Check size={13} /> : <Plus size={13} />}
                          {added ? "Added" : "Boost"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}

export default function SpotlightPanel({ canEdit, toast }) {
  const { data, status } = useSpotlight();
  return (
    <section className="au-panel cm-panel cm-spotlight" aria-label="Home hero products">
      <header className="cm-sp-head">
        <span className="cm-sp-head-icon" aria-hidden="true">
          <Sparkles size={19} />
        </span>
        <div>
          <h3>Home hero products</h3>
          <p>
            Boost up to {data.max} products into each Home hero. Changes show on the site within
            moments, and any empty spot fills with the newest product.
          </p>
        </div>
      </header>
      {status === "error" ? (
        <p className="cm-warn">Could not load the boosted products. Reload the page to try again.</p>
      ) : (
        <div className="cm-sp-grid">
          {SURFACES.map((s) => (
            <Surface
              key={s.key}
              s={s}
              picks={data[s.key] || []}
              max={data.max}
              canEdit={canEdit}
              toast={toast}
            />
          ))}
        </div>
      )}
    </section>
  );
}
