import React from "react";
import { Link } from "react-router-dom";

import {
  DIFFICULTY_TONE,
  JOB_STATES,
  dueLabel,
  postedLabel,
} from "../../../data/jobsStore";
import { formatPrice } from "../../../data/remakerMarketplaceData";

export default function JobCard({ job }) {
  const state = JOB_STATES[job.status];
  const open = job.status === "Open";
  const due = !open && job.status !== "Completed" ? dueLabel(job.dueAt) : "";

  return (
    <article
      className={`job-card ${job.status === "Needs changes" ? "attention" : ""}`}
    >
      <div className="job-media">
        <img
          src={
            job.status === "Completed" && job.afterImage
              ? job.afterImage
              : job.before[0]
          }
          alt=""
          loading="lazy"
        />
        <span className={`rk-badge ${state.tone}`}>{state.label}</span>
        <span className="job-fee">{formatPrice(job.fee)}</span>
      </div>

      <div className="job-body">
        <div className="job-top">
          <span>{job.category}</span>
          <span className={`rk-badge ${DIFFICULTY_TONE[job.difficulty]}`}>
            {job.difficulty}
          </span>
        </div>

        <h3>
          <Link to={`/remaker-jobs/${job.id}`} className="job-link">
            {job.title}
          </Link>
        </h3>
        <p>{job.summary}</p>

        <dl className="job-meta">
          <div>
            <dt>{open ? "Time allowed" : "Deadline"}</dt>
            <dd>
              {open
                ? `${job.days} days`
                : job.status === "Completed"
                  ? "Finished"
                  : due}
            </dd>
          </div>
          <div>
            <dt>Warehouse</dt>
            <dd>{job.warehouse.split(",")[0]}</dd>
          </div>
          <div>
            <dt>{open ? "Posted" : "Job ID"}</dt>
            <dd>{open ? postedLabel(job.postedAt) : job.id}</dd>
          </div>
        </dl>

        {job.status === "Needs changes" && (
          <p className="job-alert">The quality check found things to fix.</p>
        )}
      </div>
    </article>
  );
}
