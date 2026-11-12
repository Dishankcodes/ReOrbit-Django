import React from "react";
import { Link, useParams } from "react-router-dom";

import PortfolioForm from "../../pages-components/PortfolioForm";
import { useWorkState } from "../../data/portfolioStore";

import "../../css/ReMakerPortfolio.css";

export default function ReMakerPortfolioEdit() {
  /* works with both /:workId and /:id */
  const params = useParams();
  const workId = params.workId ?? params.id;
  const { work, loading, error, retry } = useWorkState(workId);

  if (loading) {
    return (
      <section className="rpt">
        <div className="rpt-empty" role="status" aria-live="polite">
          <p>Loading this work...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rpt">
        <div className="rpt-missing">
          <h2>We couldn&apos;t load this work</h2>
          <p>{error}</p>
          <button type="button" className="rpt-btn primary" onClick={retry}>
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (!work) {
    return (
      <section className="rpt">
        <div className="rpt-missing">
          <img src="https://images.pexels.com/photos/14792097/pexels-photo-14792097.jpeg?auto=compress&cs=tinysrgb&w=1000" alt="" />
          <h2>We couldn&apos;t find that work</h2>
          <p>It may have been deleted, or the link is out of date.</p>
          <Link to="/remaker-portfolio" className="rpt-btn primary">
            Back to portfolio
          </Link>
        </div>
      </section>
    );
  }

  /* key resets the form when switching between works */
  return <PortfolioForm key={work.id} mode="edit" work={work} />;
}
