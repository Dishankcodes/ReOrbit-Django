import React from "react";
import { ShieldCheck, Flag } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";
import StatusBadge from "../../../components/ui/StatusBadge";
import { formatDate } from "../../../utils/format";

export default function ReportsTab({ user, noun = "user" }) {
  if (user.reports.length === 0) {
    return (
      <section className="aup-card">
        <EmptyState
          icon={ShieldCheck}
          title="No reports"
          text={`Nobody has reported this ${noun}, and they have not reported anyone.`}
        />
      </section>
    );
  }

  return (
    <section className="aup-card">
      <header className="aup-card-head">
        <div>
          <h3>Reports</h3>
          <p>Reports filed against this {noun} and reports they have raised.</p>
        </div>
      </header>
      <ul className="aup-list">
        {user.reports.map((report) => (
          <li key={report.report_id} className="aup-list-row aup-report">
            <span
              className={`aup-report-icon ${report.direction.startsWith("Against") ? "against" : ""}`}
            >
              <Flag size={16} />
            </span>
            <div className="aup-list-main">
              <strong>{report.reason}</strong>
              <span>{report.description}</span>
              <small>
                <span className="aup-mono">{report.report_id}</span> ·{" "}
                {report.direction} · {report.report_type} · with{" "}
                {report.other_party} · {formatDate(report.created_at)}
              </small>
            </div>
            <div className="aup-list-end">
              <StatusBadge status={report.status} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
