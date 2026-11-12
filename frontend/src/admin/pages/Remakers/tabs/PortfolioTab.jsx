import React from "react";
import { Images } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";
import { SkeletonRows } from "../../../../shared/components/Skeleton";
import { formatDate } from "../../../utils/format";

export default function PortfolioTab({ remaker }) {
  if (remaker.portfolioLoading) {
    return (
      <section className="aup-card">
        <SkeletonRows count={3} />
      </section>
    );
  }
  if (remaker.portfolioError) {
    return (
      <section className="aup-card">
        <EmptyState
          icon={Images}
          title="Could not load the portfolio"
          text={remaker.portfolioError}
          action={
            <button
              type="button"
              className="ad-btn ad-btn-primary ad-btn-sm"
              onClick={remaker.reloadPortfolio}
            >
              Try again
            </button>
          }
        />
      </section>
    );
  }
  if (remaker.portfolio.length === 0) {
    return (
      <section className="aup-card">
        <EmptyState
          icon={Images}
          title="No portfolio yet"
          text="Before and after work this ReMaker shares will be shown here."
        />
      </section>
    );
  }
  return (
    <div className="rm-portfolio">
      {remaker.portfolio.map((p) => (
        <article key={p.portfolio_id} className="rm-pf">
          <div className="rm-pf-images">
            <figure>
              <img src={p.before_image} alt={`${p.title} before`} />
              <figcaption>Before</figcaption>
            </figure>
            <figure>
              <img src={p.after_image} alt={`${p.title} after`} />
              <figcaption>After</figcaption>
            </figure>
          </div>
          <div className="rm-pf-body">
            <h4>{p.title}</h4>
            <p>{p.description}</p>
            <small>
              {p.portfolio_id} · Uploaded {formatDate(p.uploaded_at)}
            </small>
          </div>
        </article>
      ))}
    </div>
  );
}
