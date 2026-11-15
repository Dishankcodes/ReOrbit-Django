import React, { useEffect, useState } from "react";
import { Sparkles, Search, X, Plus, ImageOff } from "lucide-react";
import { useSpotlight, saveSpotlight, searchSpotlight } from "../../../data/contentStore";

const SURFACES = [
  { key: "user", title: "Member & visitor Home", blurb: "The 3 stacked product cards in the Home hero." },
  { key: "remaker", title: "ReMaker Home", blurb: "The 3 photos in the ReMaker Home hero." },
];

function Surface({ s, picks, max, canEdit, toast }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState([]);
  const [busy, setBusy] = useState(false);
  const ids = picks.map((p) => p.id);

  useEffect(() => {
    if (!canEdit || q.trim().length < 2) {
      setFound([]);
      return undefined;
    }
    let live = true;
    const t = setTimeout(() => {
      searchSpotlight(q.trim())
        .then((r) => live && setFound(r))
        .catch(() => live && setFound([]));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, canEdit]);

  const commit = async (next, okMsg) => {
    setBusy(true);
    try {
      await saveSpotlight(s.key, next);
      toast(okMsg);
    } catch (e) {
      toast(e?.errors ? Object.values(e.errors).flat()[0] : e?.message || "That did not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cm-spot">
      <h4>{s.title}</h4>
      <p className="cm-hint">{s.blurb}</p>
      <ol className="cm-spot-slots">
        {Array.from({ length: max }, (_, i) => {
          const p = picks[i];
          return (
            <li key={i} className={p ? "full" : "empty"}>
              <span className="cm-spot-n">{i + 1}</span>
              {p ? (
                <>
                  {p.cover ? <img src={p.cover} alt="" /> : <ImageOff size={18} />}
                  <div>
                    <strong>{p.title}</strong>
                    <small>{p.seller || p.category}</small>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      aria-label={`Remove ${p.title}`}
                      disabled={busy}
                      onClick={() => commit(ids.filter((x) => x !== p.id), `${p.title} was removed from the hero.`)}
                    >
                      <X size={14} />
                    </button>
                  )}
                </>
              ) : (
                <em>Empty: the newest product fills this spot</em>
              )}
            </li>
          );
        })}
      </ol>
      {canEdit && picks.length < max && (
        <>
          <label className="cm-links-search">
            <Search size={13} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a product to boost" />
          </label>
          {found.length > 0 && (
            <ul className="cm-spot-found">
              {found.map((p) => (
                <li key={p.id}>
                  {p.cover ? <img src={p.cover} alt="" /> : <ImageOff size={16} />}
                  <div>
                    <strong>{p.title}</strong>
                    <small>{p.seller || p.category}</small>
                  </div>
                  <button
                    type="button"
                    className="ad-btn ad-btn-ghost ad-btn-sm"
                    disabled={busy || ids.includes(p.id)}
                    onClick={() => {
                      setQ("");
                      commit([...ids, p.id], `${p.title} is boosted.`);
                    }}
                  >
                    <Plus size={13} /> {ids.includes(p.id) ? "Added" : "Boost"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default function SpotlightPanel({ canEdit, toast }) {
  const { data, status } = useSpotlight();
  return (
    <section className="au-panel cm-panel cm-spotlight" aria-label="Home hero products">
      <header className="cm-spot-head">
        <Sparkles size={18} />
        <div>
          <h3>Home hero products</h3>
          <p className="cm-hint">
            Boost up to {data.max} products into the hero collage. Changes show on the site within moments.
            Empty spots fill with the newest products.
          </p>
        </div>
      </header>
      {status === "error" ? (
        <p className="cm-warn">Could not load the boosted products. Reload the page to try again.</p>
      ) : (
        <div className="cm-spot-grid">
          {SURFACES.map((s) => (
            <Surface key={s.key} s={s} picks={data[s.key] || []} max={data.max} canEdit={canEdit} toast={toast} />
          ))}
        </div>
      )}
    </section>
  );
}
