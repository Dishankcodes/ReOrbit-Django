import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/api";
import "./RateReOrbit.css";

const LABELS = ["", "Poor", "Could be better", "Good", "Great", "Love it"];
const IDEAS = {
  user: {
    high: [
      "Love the second-life idea.",
      "Easy to sell things I no longer use.",
      "Great finds at fair prices.",
      "Donation pickup was quick and free.",
      "Support was quick and kind.",
      "Orbit Points make it fun to keep going.",
      "Feels good to shop without waste.",
      "Delivery was smooth and on time.",
    ],
    mid: [
      "Good idea, a few rough edges.",
      "I'd like more items near me.",
      "Delivery could be a little faster.",
      "Search could be easier to use.",
    ],
    low: [
      "The app could be easier to use.",
      "Delivery took too long.",
      "I couldn't find what I needed.",
      "Support took a while to reply.",
      "Prices felt high for used items.",
    ],
  },
  remaker: {
    high: [
      "Great place to sell my creations.",
      "Easy to find materials to rescue.",
      "Buyers really value handmade work.",
      "ReOrbit pickup saves me a lot of time.",
      "Payouts are clear and on time.",
      "The studio page shows my work well.",
    ],
    mid: [
      "Good platform, I'd like more buyers.",
      "Listing products could be quicker.",
      "More analytics would help.",
    ],
    low: [
      "Not many orders yet.",
      "Payouts took too long.",
      "Hard to find the right materials.",
    ],
  },
};

/* Help › Rate ReOrbit: a member or ReMaker rates the platform. The team may pick it for the Home page
   (Admin › Testimonials). `side` only changes the colours. */
export default function RateReOrbit({ side = "user" }) {
  const [mine, setMine] = useState(undefined);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let alive = true;
    apiRequest("/content/feedback/mine/")
      .then((r) => {
        if (!alive) return;
        const f = r.data.feedback;
        setMine(f);
        if (f) {
          setRating(f.rating);
          setText(f.message);
        }
      })
      .catch(() => alive && setMine(null));
    return () => {
      alive = false;
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!rating) return setErr("Choose how many stars.");
    if (text.trim().length < 10) return setErr("Tell us a little more (at least 10 characters).");
    setBusy(true);
    try {
      const r = await apiRequest("/content/feedback/", { method: "POST", body: { rating, message: text.trim() } });
      setMine(r.data.feedback);
      setEditing(false);
      setMsg(r.message || "Thank you!");
    } catch (ex) {
      setErr(ex.errors?.message?.[0] || ex.errors?.rating?.[0] || ex.message || "Not sent. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (mine === undefined) return null;
  const shown = hover || rating;
  const set = IDEAS[side] || IDEAS.user;
  const ideas = rating >= 4 ? set.high : rating === 3 ? set.mid : rating ? set.low : [];
  const done = mine && !editing;

  return (
    <section className={`rro rro--${side}`} aria-label="Rate ReOrbit">
      <div className="rro-intro">
        <span className="rro-badge">Rate ReOrbit</span>
        <h3>{done ? "Thanks for rating ReOrbit" : "How is ReOrbit working for you?"}</h3>
        <p>
          {done
            ? mine.shown
              ? "Your words are on the ReOrbit Home page. Thank you!"
              : "The team reads every rating. A few are chosen for the Home page."
            : "Your rating helps us improve, and the team may share it on the Home page with your first name."}
        </p>
      </div>

      {done ? (
        <div className="rro-done">
          <div className="rro-done-card">
            <div className="rro-stars static" aria-label={`${mine.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= mine.rating ? "on" : ""}>
                  ★
                </span>
              ))}
              <em>{LABELS[mine.rating]}</em>
            </div>
            <p>“{mine.message}”</p>
            {mine.shown && <span className="rro-chip">On the Home page</span>}
          </div>
          <div className="rro-done-foot">
            {msg && <small className="rro-ok">{msg}</small>}
            <button type="button" className="rro-edit" onClick={() => (setEditing(true), setMsg(""))}>
              Edit my rating
            </button>
          </div>
        </div>
      ) : (
        <form className="rro-form" onSubmit={submit} noValidate>
          <div className="rro-stars" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                className={n <= shown ? "on" : ""}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
              >
                ★
              </button>
            ))}
            <em>{LABELS[shown]}</em>
          </div>
          <textarea
            rows={3}
            maxLength={400}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What do you like about ReOrbit, or what should we make better?"
            aria-label="Your message"
          />
          {ideas.length > 0 && (
            <div className="rro-ideas">
              {ideas.map((i) => (
                <button
                  key={i}
                  type="button"
                  className={text.includes(i) ? "on" : ""}
                  onClick={() =>
                    setText((t) => (t.includes(i) ? t.replace(i, "").replace(/\s{2,}/g, " ").trim() : `${t.trim()} ${i}`.trim().slice(0, 400)))
                  }
                >
                  {i}
                </button>
              ))}
            </div>
          )}
          <div className="rro-foot">
            <small>{text.length}/400</small>
            {err && (
              <span className="rro-err" role="alert">
                {err}
              </span>
            )}
            {editing && (
              <button type="button" className="rro-link" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
            <button type="submit" className="rro-submit" disabled={busy}>
              {busy ? "Sending…" : mine ? "Update rating" : "Submit rating"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
