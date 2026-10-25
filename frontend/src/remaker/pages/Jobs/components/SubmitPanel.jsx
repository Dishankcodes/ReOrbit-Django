import React, { useRef, useState } from "react";

import { fileToDataUrl } from "../../../data/portfolioStore";

/* Photo + note + checklist, then hand the finished work in for the quality check */
export default function SubmitPanel({ job, onAddProgress, onSubmit }) {
  const [update, setUpdate] = useState("");
  const [updatePhoto, setUpdatePhoto] = useState("");
  const [after, setAfter] = useState(job.afterImage || "");
  const [note, setNote] = useState("");
  const [checks, setChecks] = useState({});
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState("");
  const progressFile = useRef(null);
  const afterFile = useRef(null);

  const toggle = (index) =>
    setChecks((current) => ({ ...current, [index]: !current[index] }));

  const pick = async (file, apply) => {
    if (!file) return;
    setError("");

    try {
      apply(await fileToDataUrl(file, 1200, 0.8));
    } catch (problem) {
      setError(problem.message);
    }
  };

  const allChecked = job.requirements.every((_, index) => checks[index]);

  const postUpdate = () => {
    if (update.trim().length < 3) return;

    onAddProgress({ text: update, photo: updatePhoto });
    setUpdate("");
    setUpdatePhoto("");
  };

  const submit = () => {
    setAttempted(true);

    if (!after || !allChecked || note.trim().length < 10) return;

    onSubmit({ afterImage: after, note });
  };

  return (
    <>
      <section className="rk-card">
        <h3>Add a progress update</h3>
        <div className="rk-field">
          <label htmlFor="job-update" className="sr-only">
            Progress note
          </label>
          <textarea
            id="job-update"
            rows={3}
            maxLength={400}
            value={update}
            onChange={(event) => setUpdate(event.target.value)}
            placeholder="What did you do today? Mention anything the warehouse should know."
          />
        </div>

        <div className="job-row">
          {updatePhoto ? (
            <span className="job-thumb">
              <img src={updatePhoto} alt="Photo for this update" />
              <button type="button" onClick={() => setUpdatePhoto("")}>
                Remove
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="rk-btn ghost small"
              onClick={() => progressFile.current?.click()}
            >
              Add a photo
            </button>
          )}

          <button
            type="button"
            className="rk-btn primary small"
            onClick={postUpdate}
            disabled={update.trim().length < 3}
          >
            Post update
          </button>
        </div>

        <input
          ref={progressFile}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            pick(event.target.files?.[0], setUpdatePhoto);
            event.target.value = "";
          }}
        />
      </section>

      <section className="rk-card job-submit">
        <h3>
          {job.status === "Needs changes"
            ? "Resubmit for quality check"
            : "Submit for quality check"}
        </h3>
        <p className="job-muted">
          When the work is done, add a photo of the finished piece. We check it
          and pay you if it passes.
        </p>

        <div
          className="rk-field"
          data-invalid={attempted && !after ? "true" : undefined}
        >
          <span className="rk-label">Photo of the finished piece</span>

          {after ? (
            <span className="job-after">
              <img src={after} alt="Finished piece" />
              <button type="button" onClick={() => setAfter("")}>
                Change photo
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="job-drop"
              onClick={() => afterFile.current?.click()}
            >
              <img src={job.before[0]} alt="" />
              <b>Add the “after” photo</b>
            </button>
          )}

          <input
            ref={afterFile}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              pick(event.target.files?.[0], setAfter);
              event.target.value = "";
            }}
          />
          {attempted && !after && (
            <span className="rk-error">
              The quality check needs a photo of the finished piece.
            </span>
          )}
        </div>

        <fieldset className="job-checks">
          <legend>Before you send it</legend>
          {job.requirements.map((item, index) => (
            <label key={item} className={checks[index] ? "on" : ""}>
              <input
                type="checkbox"
                checked={Boolean(checks[index])}
                onChange={() => toggle(index)}
              />
              <span aria-hidden="true" />
              {item}
            </label>
          ))}
          {attempted && !allChecked && (
            <span className="rk-error">
              Tick every item to confirm it is done.
            </span>
          )}
        </fieldset>

        <div className="rk-field">
          <label htmlFor="job-note">Note for the quality team</label>
          <textarea
            id="job-note"
            rows={3}
            maxLength={400}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Tell us what you did, the finish you used and how to care for it."
            aria-invalid={
              attempted && note.trim().length < 10 ? "true" : undefined
            }
          />
          {attempted && note.trim().length < 10 && (
            <span className="rk-error">
              Add a short note, at least 10 characters.
            </span>
          )}
        </div>

        {error && <p className="rk-error">{error}</p>}

        <button type="button" className="rk-btn primary" onClick={submit}>
          {job.status === "Needs changes" ? "Resubmit work" : "Submit work"}
        </button>
      </section>
    </>
  );
}
