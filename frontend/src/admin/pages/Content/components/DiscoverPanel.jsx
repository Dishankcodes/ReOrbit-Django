import React, { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Crown, ImageOff, Plus, Search, Star, X } from "lucide-react";
import { apiRequest } from "../../../../api/api";

/* Admin › Content › Discover: the ReMakers on the before-login /discover-remakers page.
   One spotlight (with up to 3 pictures of its creations) and up to 9 cards. Anything left empty is
   filled with the highest-rated ReMakers, so the page is never blank. */
function Maker({ r, children }) {
  return (
    <div className="cm-dc-maker">
      <span className="cm-dc-av">{r.avatar || r.cover ? <img src={r.avatar || r.cover} alt="" /> : r.name.charAt(0)}</span>
      <span className="cm-dc-meta">
        <strong>{r.name}</strong>
        <small>
          {[r.city, `${r.creations} creations`].filter(Boolean).join(" · ")}
          {r.reviews ? (
            <em>
              <Star size={11} fill="currentColor" /> {r.rating.toFixed(1)} ({r.reviews})
            </em>
          ) : null}
        </small>
      </span>
      {children}
    </div>
  );
}

export default function DiscoverPanel({ canEdit, toast }) {
  const [state, setState] = useState(null);
  const [spot, setSpot] = useState(null);
  const [imgs, setImgs] = useState([]);
  const [cards, setCards] = useState([]);
  const [term, setTerm] = useState("");
  const [found, setFound] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const take = (d) => {
    setState(d);
    setSpot(d.spotlight);
    setImgs(d.images.map((x) => x.id));
    setCards(d.cards);
  };
  useEffect(() => {
    apiRequest("/content/admin/discover/")
      .then((r) => take(r.data))
      .catch((e) => setErr(e.message || "Could not load."));
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      apiRequest(`/content/admin/discover/search/?q=${encodeURIComponent(term.trim())}`)
        .then((r) => setFound(r.data.results))
        .catch(() => setFound([]));
    }, 250);
    return () => clearTimeout(t);
  }, [term]);

  const max = state?.max_cards || 9;
  const maxImgs = state?.max_images || 3;
  const choices = spot && state?.spotlight?.id === spot.id ? state.image_choices : [];
  const dirty =
    state &&
    (state.spotlight?.id !== spot?.id ||
      state.images.map((x) => x.id).join() !== imgs.join() ||
      state.cards.map((c) => c.id).join() !== cards.map((c) => c.id).join());

  const move = (i, d) => {
    const n = [...cards];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    setCards(n);
  };
  const save = async () => {
    setBusy(true);
    try {
      const r = await apiRequest("/content/admin/discover/", {
        method: "PUT",
        body: { spotlight: spot?.id || null, images: imgs, cards: cards.map((c) => c.id) },
      });
      take(r.data);
      toast(r.message);
    } catch (e) {
      toast(e.message || "Not saved.");
    } finally {
      setBusy(false);
    }
  };

  if (err) return <p className="cm-warn">{err}</p>;
  if (!state) return <p className="cm-sp-note">Loading…</p>;

  return (
    <section className="au-panel cm-panel cm-dc" aria-label="Discover ReMakers page">
      <header className="cm-sp-head">
        <span className="cm-sp-head-icon" aria-hidden="true">
          <Crown size={19} />
        </span>
        <div>
          <h3>Discover ReMakers page</h3>
          <p>
            Choose the spotlight ReMaker and up to {max} featured cards for{" "}
            <a href="/discover-remakers" target="_blank" rel="noreferrer">
              /discover-remakers
            </a>
            . Empty places fill with the highest-rated ReMakers (then the longest on ReOrbit).
          </p>
        </div>
      </header>

      <div className="cm-dc-grid">
        <div className="cm-dc-col">
          <h4>
            Spotlight <span className="cm-count">1 ReMaker</span>
          </h4>
          {spot ? (
            <Maker r={spot}>
              {canEdit && (
                <button type="button" className="cm-dc-x" onClick={() => (setSpot(null), setImgs([]))} aria-label="Remove">
                  <X size={14} />
                </button>
              )}
            </Maker>
          ) : (
            <p className="cm-dc-auto">
              <strong>Automatic</strong> {state.showing.spotlight_name || state.showing.spotlight || "No ReMakers yet"}. Pick one on the right to choose yourself.
            </p>
          )}
          {spot && (
            <>
              <h5>
                Pictures ({imgs.length}/{maxImgs})
              </h5>
              {choices.length === 0 ? (
                <p className="cm-sp-note">
                  {state.spotlight?.id === spot.id
                    ? "This ReMaker has no live creations; their cover photo is used."
                    : "Save first, then pick from this ReMaker's creations. Until then the newest are used."}
                </p>
              ) : (
                <div className="cm-dc-imgs">
                  {choices.map((c) => {
                    const on = imgs.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={on ? "on" : ""}
                        disabled={!canEdit || (!on && imgs.length >= maxImgs)}
                        onClick={() => setImgs(on ? imgs.filter((x) => x !== c.id) : [...imgs, c.id])}
                        title={c.title}
                      >
                        {c.cover ? <img src={c.cover} alt={c.title} /> : <ImageOff size={16} />}
                        {on && <em>{imgs.indexOf(c.id) + 1}</em>}
                      </button>
                    );
                  })}
                </div>
              )}
              <small className="cm-sp-note">Not picked: the studio cover and newest creations are used.</small>
            </>
          )}

          <h4 className="cm-dc-h">
            Featured cards <span className="cm-count">{cards.length} of {max}</span>
          </h4>
          {cards.length === 0 && (
            <p className="cm-dc-auto">
              <strong>Automatic</strong> The {max} highest-rated ReMakers. Use <Plus size={12} /> on the right to choose.
            </p>
          )}
          <ol className="cm-dc-list">
            {cards.map((c, i) => (
              <li key={c.id}>
                <Maker r={c}>
                  {canEdit && (
                    <span className="cm-dc-tools">
                      <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Up">
                        <ArrowUp size={13} />
                      </button>
                      <button type="button" disabled={i === cards.length - 1} onClick={() => move(i, 1)} aria-label="Down">
                        <ArrowDown size={13} />
                      </button>
                      <button type="button" onClick={() => setCards(cards.filter((x) => x.id !== c.id))} aria-label="Remove">
                        <X size={13} />
                      </button>
                    </span>
                  )}
                </Maker>
              </li>
            ))}
          </ol>
        </div>

        {canEdit && (
          <div className="cm-dc-col">
            <h4>Find ReMakers</h4>
            <label className="au-search">
              <Search size={15} />
              <input
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Name, studio, city or RMK-…"
                aria-label="Search ReMakers"
              />
            </label>
            <ul className="cm-dc-list cm-dc-found">
              {found.map((r) => (
                <li key={r.id}>
                  <Maker r={r}>
                    <span className="cm-dc-tools wide">
                      <button
                        type="button"
                        disabled={spot?.id === r.id}
                        onClick={() => (setSpot(r), setImgs([]))}
                        title="Make spotlight"
                      >
                        <Crown size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={cards.length >= max || cards.some((c) => c.id === r.id)}
                        onClick={() => setCards([...cards, r])}
                        title="Add as a card"
                      >
                        <Plus size={13} />
                      </button>
                    </span>
                  </Maker>
                </li>
              ))}
              {found.length === 0 && <p className="cm-sp-note">No active ReMakers match.</p>}
            </ul>
          </div>
        )}
      </div>

      {canEdit && (
        <footer className="cm-dc-foot">
          <span className={`cm-dc-state${dirty ? " dirty" : ""}`}>
            {dirty ? "You have unsaved changes." : "Everything is saved. Changes show on the page right away."}
          </span>
          <button type="button" className="ad-btn ad-btn-primary" disabled={!dirty || busy} onClick={save}>
            {busy ? "Saving…" : "Save Discover page"}
          </button>
        </footer>
      )}
    </section>
  );
}
