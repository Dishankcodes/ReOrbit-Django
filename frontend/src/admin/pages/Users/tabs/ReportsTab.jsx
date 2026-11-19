import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Flag } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";
import StatusBadge from "../../../components/ui/StatusBadge";
import { formatDate } from "../../../utils/format";

export default function ReportsTab({ user, noun = "user" }) {
  const navigate = useNavigate();
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
          <li
            key={report.report_id}
            className="aup-list-row aup-report aup-row-link"
            role="link"
            tabIndex={0}
            title="Open this report"
            onClick={() => navigate(`/admin-complaints/${report.report_id}`)}
            onKeyDown={(e) => e.key === "Enter" && navigate(`/admin-complaints/${report.report_id}`)}
          >
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
