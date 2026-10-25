import React from "react";
import { Hammer, ArrowRight } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";
import StatusBadge from "../../../components/ui/StatusBadge";
import { formatDate } from "../../../utils/format";

export default function RefurbishmentsTab({ remaker }) {
  if (remaker.refurbishments.length === 0) {
    return (
      <section className="aup-card">
        <EmptyState
          icon={Hammer}
          title="No refurbishments"
          text="Warehouse items assigned to this ReMaker for refurbishment will be tracked here."
        />
      </section>
    );
  }
  return (
    <div className="rm-refurbs">
      {remaker.refurbishments.map((r) => (
        <article key={r.refurbishment_id} className="aup-card rm-refurb">
          <div className="rm-refurb-images" aria-label="Before and after">
            <img src={r.before_image} alt="Before" />
            <ArrowRight size={16} />
            {r.after_image ? (
              <img src={r.after_image} alt="After" />
            ) : (
              <span className="rm-ph">In work</span>
            )}
          </div>
          <div className="rm-refurb-main">
            <h3>{r.title}</h3>
            <p>{r.notes}</p>
            <div className="rm-refurb-dates">
              <span>
                Item <b className="aup-mono">{r.item_id}</b>
              </span>
              <span>
                Assigned <b>{formatDate(r.assigned_date)}</b>
              </span>
              <span>
                Started <b>{formatDate(r.start_date)}</b>
              </span>
              <span>
                Completed <b>{formatDate(r.completion_date)}</b>
              </span>
            </div>
            <small className="aup-mono">
              {r.refurbishment_id} · {r.assigned_by}
            </small>
          </div>
          <div className="rm-refurb-end">
            <StatusBadge status={r.refurbishment_status} />
            <span className="aup-sub">Quality:</span>
            <StatusBadge status={r.quality_status} />
          </div>
        </article>
      ))}
    </div>
  );
}
