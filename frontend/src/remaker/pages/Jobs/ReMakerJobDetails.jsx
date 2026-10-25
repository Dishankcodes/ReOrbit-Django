import React, { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";

import BeforeAfter from "../../pages-components/BeforeAfter";
import {
  DIFFICULTY_TONE,
  JOB_STATES,
  acceptJob,
  addProgress,
  dateLabel,
  declineJob,
  decideQuality,
  dueLabel,
  postedLabel,
  startJob,
  submitJob,
  useJob,
} from "../../data/jobsStore";
import { formatPrice } from "../../data/remakerMarketplaceData";

import ConfirmModal from "./components/ConfirmModal";
import ProgressLog from "./components/ProgressLog";
import SubmitPanel from "./components/SubmitPanel";

import "../../css/ReMakerUi.css";
import "./JobsPage.css";

const STEPS = ["Assigned", "In progress", "In review", "Completed"];

function stepIndex(status) {
  if (status === "Open") return -1;
  if (status === "Assigned") return 0;
  if (status === "In progress" || status === "Needs changes") return 1;
  if (status === "In review") return 2;
  return 3;
}

export default function ReMakerJobDetails() {
  const params = useParams();
  const jobId = params.jobId ?? params.id;
  const job = useJob(jobId);

  if (!job) {
    return (
      <section className="rk job">
        <div className="rk-empty">
          <div className="rk-empty-art" aria-hidden="true">
            <img src="/images/portfolio/before-tara-chair.jpg" alt="" />
            <img src="/images/portfolio/before-arjun-metal.jpg" alt="" />
          </div>
          <h3>We could not find that job</h3>
          <p>
            It may have been taken by another ReMaker, or the link is out of
            date.
          </p>
          <Link to="/remaker-jobs" className="rk-btn primary">
            Back to jobs
          </Link>
        </div>
      </section>
    );
  }

  return <Details key={job.id} job={job} />;
}

function Details({ job }) {
  const location = useLocation();
  const [params] = useSearchParams();
  const demo = params.get("demo") === "1";

  const [modal, setModal] = useState(null); /* "accept" | "decline" | "start" */
  const [photo, setPhoto] = useState(0);
  const [notice, setNotice] = useState(location.state?.notice || "");
  const timer = useRef(null);

  useEffect(() => {
    if (!notice) return undefined;

    timer.current = setTimeout(() => setNotice(""), 3600);
    return () => clearTimeout(timer.current);
  }, [notice]);

  const state = JOB_STATES[job.status];
  const index = stepIndex(job.status);
  const working =
    job.status === "In progress" || job.status === "Needs changes";
  const showCompare =
    job.afterImage && ["In review", "Completed"].includes(job.status);

  const confirm = () => {
    if (modal === "accept") {
      acceptJob(job.id);
      setNotice("Job accepted. Collect the item from the warehouse.");
    }
    if (modal === "decline") {
      declineJob(job.id);
      setNotice("You handed the job back. Another ReMaker can take it now.");
    }
    if (modal === "start") {
      startJob(job.id);
      setNotice("Work started. Add updates as you go.");
    }

    setModal(null);
  };

  return (
    <section className="rk job">
      <nav className="rk-crumbs" aria-label="Breadcrumb">
        <Link to="/remaker-jobs">Warehouse jobs</Link>
        <span aria-hidden="true">/</span>
        <strong>{job.id}</strong>
      </nav>

      <header className="job-head">
        <div>
          <div className="job-head-tags">
            <span className={`rk-badge ${state.tone}`}>{state.label}</span>
            <span className={`rk-badge ${DIFFICULTY_TONE[job.difficulty]}`}>
              {job.difficulty}
            </span>
            <span className="job-id">
              {job.id} · Item {job.itemId}
            </span>
          </div>
          <h2>{job.title}</h2>
          <p>{job.summary}</p>
        </div>

        <div className="job-head-fee">
          <small>Your fee</small>
          <strong>{formatPrice(job.fee)}</strong>
        </div>
      </header>

      {index >= 0 && (
        <ol className="job-steps" aria-label="Job progress">
          {STEPS.map((step, i) => (
            <li
              className={
                i < index || (i === index && job.status === "Completed")
                  ? "done"
                  : i === index
                    ? "current"
                    : ""
              }
              key={step}
            >
              <span aria-hidden="true" />
              {step === "In review" ? "Quality check" : step}
            </li>
          ))}
        </ol>
      )}

      <div className="job-layout">
        <div className="job-main">
          {/* photos */}
          <section className="rk-card">
            <h3>{showCompare ? "Before and after" : "The item"}</h3>

            {showCompare ? (
              <BeforeAfter
                before={job.before[0]}
                after={job.afterImage}
                title={job.title}
                interactive
                className="rpt-ba-lg"
              />
            ) : (
              <>
                <div className="job-photo">
                  <img
                    src={job.before[photo]}
                    alt={`${job.title}, photo ${photo + 1}`}
                  />
                  <span>As received</span>
                </div>

                {job.before.length > 1 && (
                  <div className="job-thumbs">
                    {job.before.map((src, i) => (
                      <button
                        type="button"
                        key={src}
                        className={photo === i ? "active" : ""}
                        onClick={() => setPhoto(i)}
                        aria-label={`Show photo ${i + 1}`}
                      >
                        <img src={src} alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* quality result */}
          {job.qc && job.qc.status !== "Pending" && (
            <section
              className={`rk-card job-qc ${job.qc.status === "Passed" ? "pass" : "fail"}`}
            >
              <h3>
                Quality check:{" "}
                {job.qc.status === "Passed" ? "passed" : "needs changes"}
              </h3>
              <p>{job.qc.note}</p>
            </section>
          )}

          {job.status === "In review" && (
            <section className="rk-card job-qc wait">
              <h3>Waiting for the quality check</h3>
              <p>
                The warehouse team is reviewing your photos. This usually takes
                a day. You will get a notification with the result.
              </p>
            </section>
          )}

          {/* brief */}
          <section className="rk-card">
            <h3>About this job</h3>
            <p className="job-text">{job.brief}</p>

            <h4>What we need</h4>
            <ul className="job-reqs">
              {job.requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h4>Materials</h4>
            <p className="job-text">{job.materials}</p>
          </section>

          {/* work area */}
          {working && (
            <SubmitPanel
              job={job}
              onAddProgress={(entry) => {
                addProgress(job.id, entry);
                setNotice("Update posted.");
              }}
              onSubmit={(data) => {
                submitJob(job.id, data);
                setNotice(
                  "Work submitted. The quality check usually takes a day.",
                );
              }}
            />
          )}

          <section className="rk-card">
            <h3>Progress updates</h3>
            <ProgressLog items={job.progress} />
          </section>
        </div>

        {/* side */}
        <aside className="job-side">
          <section className="rk-card job-actions">
            <h3>{job.status === "Open" ? "Take this job" : "Your job"}</h3>

            {job.status === "Open" && (
              <>
                <p className="job-muted">
                  Accept it and the item is reserved for you. You will have{" "}
                  {job.days} days from today to finish.
                </p>
                <button
                  type="button"
                  className="rk-btn primary"
                  onClick={() => setModal("accept")}
                >
                  Accept job
                </button>
              </>
            )}

            {job.status === "Assigned" && (
              <>
                <p className="job-muted">
                  Collect the item from the warehouse, then start the job.{" "}
                  {dueLabel(job.dueAt)}.
                </p>
                <button
                  type="button"
                  className="rk-btn primary"
                  onClick={() => setModal("start")}
                >
                  Start work
                </button>
                <button
                  type="button"
                  className="rk-btn danger-ghost"
                  onClick={() => setModal("decline")}
                >
                  Hand the job back
                </button>
              </>
            )}

            {working && (
              <p className="job-muted">
                {dueLabel(job.dueAt)}. Post updates as you go, then submit when
                you are done.
              </p>
            )}
            {job.status === "In review" && (
              <p className="job-muted">
                Nothing to do right now. We will tell you the result.
              </p>
            )}
            {job.status === "Completed" && (
              <p className="job-muted">
                Completed on {dateLabel(job.completedAt)}. Your fee was paid
                out.
              </p>
            )}

            <Link to="/remaker-messages/cv-6" className="rk-btn ghost">
              Message the warehouse team
            </Link>
          </section>

          <section className="rk-card">
            <h3>Fee and timing</h3>

            <dl className="job-facts">
              <div>
                <dt>Fee</dt>
                <dd>{formatPrice(job.fee)}</dd>
              </div>
              <div>
                <dt>Time allowed</dt>
                <dd>{job.days} days</dd>
              </div>
              {job.dueAt && (
                <div>
                  <dt>Deadline</dt>
                  <dd>{dateLabel(job.dueAt)}</dd>
                </div>
              )}
              <div>
                <dt>Posted</dt>
                <dd>{postedLabel(job.postedAt)}</dd>
              </div>
              <div>
                <dt>Paid</dt>
                <dd>After the check passes</dd>
              </div>
            </dl>
          </section>

          <section className="rk-card">
            <h3>Collect from</h3>

            <dl className="job-facts">
              <div>
                <dt>Warehouse</dt>
                <dd>{job.warehouse}</dd>
              </div>
              <div>
                <dt>Item weight</dt>
                <dd>{job.weight}</dd>
              </div>
              <div>
                <dt>Hours</dt>
                <dd>10 am to 5 pm, every day</dd>
              </div>
            </dl>
          </section>

          {demo && job.status === "In review" && (
            <section className="job-demo">
              <small>Demo only</small>
              <p>ReOrbit makes this decision. Pick a result to preview it.</p>
              <div>
                <button
                  type="button"
                  className="rk-btn primary small"
                  onClick={() => decideQuality(job.id, true)}
                >
                  Pass the check
                </button>
                <button
                  type="button"
                  className="rk-btn danger-ghost small"
                  onClick={() => decideQuality(job.id, false)}
                >
                  Fail the check
                </button>
              </div>
            </section>
          )}
        </aside>
      </div>

      {modal && (
        <ConfirmModal
          title={
            modal === "accept"
              ? "Accept this job?"
              : modal === "start"
                ? "Start the job?"
                : "Hand this job back?"
          }
          confirmLabel={
            modal === "accept"
              ? "Accept job"
              : modal === "start"
                ? "Start work"
                : "Hand it back"
          }
          tone={modal === "decline" ? "danger" : "primary"}
          onConfirm={confirm}
          onClose={() => setModal(null)}
        >
          {modal === "accept" && (
            <p>
              You will have {job.days} days to finish. If you cannot make it,
              you can hand the job back before you start.
            </p>
          )}
          {modal === "start" && (
            <p>
              Only start once you have collected the item from the warehouse.
              Your deadline keeps counting.
            </p>
          )}
          {modal === "decline" && (
            <p>
              Another ReMaker will be able to take it. Handing back too many
              jobs can lower your job rating.
            </p>
          )}
        </ConfirmModal>
      )}

      {notice && (
        <div className="rk-toast" role="status" aria-live="polite">
          {notice}
        </div>
      )}
    </section>
  );
}
