import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { jobTotals, useJobs } from "../../data/jobsStore";

import JobCard from "./components/JobCard";
import JobsSummary from "./components/JobsSummary";

import "../../css/ReMakerUi.css";
import "./JobsPage.css";

const TABS = [
  { key: "open", label: "Open jobs", test: (job) => job.status === "Open" },
  { key: "mine", label: "My jobs", test: (job) => ["Assigned", "In progress", "In review", "Needs changes"].includes(job.status) },
  { key: "done", label: "Completed", test: (job) => job.status === "Completed" },
];

export default function ReMakerJobs() {
  const jobs = useJobs();

  const [tab, setTab] = useState("open");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [query, setQuery] = useState("");

  const totals = useMemo(() => jobTotals(jobs), [jobs]);

  const counts = Object.fromEntries(TABS.map((item) => [item.key, jobs.filter(item.test).length]));
  const needChanges = jobs.filter((job) => job.status === "Needs changes").length;

  const inTab = useMemo(() => jobs.filter(TABS.find((item) => item.key === tab).test), [jobs, tab]);
  const categories = useMemo(() => [...new Set(inTab.map((job) => job.category))].sort(), [inTab]);

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();

    const filtered = inTab.filter((job) => {
      if (category !== "all" && job.category !== category) return false;
      if (!text) return true;
      return `${job.title} ${job.summary} ${job.category}`.toLowerCase().includes(text);
    });

    const sorters = {
      newest: (a, b) => b.postedAt.localeCompare(a.postedAt),
      pay: (a, b) => b.fee - a.fee,
      due: (a, b) => (a.dueAt || "9").localeCompare(b.dueAt || "9"),
    };

    return [...filtered].sort(sorters[sort]);
  }, [inTab, category, sort, query]);

  const switchTab = (key) => {
    setTab(key);
    setCategory("all");
  };

  return (
    <section className="rk job">
      <header className="rk-top">
        <div>
          <h2>Warehouse jobs</h2>
          <p>
            ReOrbit&apos;s warehouse offers refurbishing work to verified ReMakers. Take a job for a fixed fee, rework the
            item, send photos, and get paid after a quality check.
          </p>
        </div>

        <Link to="/remaker-help" className="rk-btn ghost">
          How jobs work
        </Link>
      </header>

      {needChanges > 0 && (
        <button type="button" className="job-alert-bar" onClick={() => switchTab("mine")}>
          <strong>{needChanges} {needChanges === 1 ? "job needs" : "jobs need"} changes after the quality check</strong>
          <span>See my jobs →</span>
        </button>
      )}

      <JobsSummary totals={totals} />

      <div className="rk-tabs" role="tablist" aria-label="Jobs">
        {TABS.map((item) => (
          <button type="button" role="tab" aria-selected={tab === item.key} className={tab === item.key ? "active" : ""} key={item.key} onClick={() => switchTab(item.key)}>
            {item.label}
            <span>{counts[item.key]}</span>
          </button>
        ))}
      </div>

      <div className="job-filters">
        <label className="rk-search">
          <span className="sr-only">Search jobs</span>
          <input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search jobs" />
        </label>

        <label className="rk-select">
          <span className="sr-only">Sort jobs</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="newest">Newest first</option>
            <option value="pay">Highest pay</option>
            <option value="due">Due soonest</option>
          </select>
        </label>
      </div>

      {categories.length > 1 && (
        <div className="rk-chips" role="group" aria-label="Category">
          {["all", ...categories].map((item) => (
            <button type="button" key={item} className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>
              {item === "all" ? "All categories" : item}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rk-empty">
          <div className="rk-empty-art" aria-hidden="true">
            <img src="/images/portfolio/before-tara-teak-cabinet.jpg" alt="" />
            <img src="/images/portfolio/tara-teak-cabinet.jpg" alt="" />
          </div>
          <h3>{tab === "open" ? "No open jobs right now" : tab === "mine" ? "You have no active jobs" : "No completed jobs yet"}</h3>
          <p>
            {tab === "open"
              ? "New jobs are posted whenever the warehouse receives items. We will notify you."
              : tab === "mine"
                ? "Take an open job and it shows up here."
                : "Finished jobs that passed the quality check are listed here."}
          </p>
          {tab !== "open" && (
            <button type="button" className="rk-btn primary" onClick={() => switchTab("open")}>
              See open jobs
            </button>
          )}
        </div>
      ) : (
        <div className="job-grid">
          {visible.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </section>
  );
}
