import React from "react";
import { Link } from "react-router-dom";

import { formatDate } from "../../../data/ordersStore";

const TONE = {
  Pending: "pending",
  Reviewed: "progress",
  Resolved: "done",
  Rejected: "bad",
};

/* Reports the ReMaker raised about orders they bought */
export default function ReportsList({ reports }) {
  return (
    <div className="hlp-tickets">
      {reports.map(({ report, order }) => (
        <Link
          to={`/remaker-orders/${order.id}/report`}
          className="hlp-ticket"
          key={report.id}
        >
          <div className="hlp-ticket-main">
            <div className="hlp-ticket-top">
              <small>
                {report.id} · About {report.type.toLowerCase()}
              </small>
            </div>
            <strong>{report.reason}</strong>
            <p>
              Order {order.id}, {order.title}. Sent on{" "}
              {formatDate(report.createdAt)}.
            </p>
          </div>

          <div className="hlp-ticket-side">
            <span className={`rk-badge ${TONE[report.status] || "muted"}`}>
              {report.status}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
