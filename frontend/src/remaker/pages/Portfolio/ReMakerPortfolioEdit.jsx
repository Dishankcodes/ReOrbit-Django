import React from "react";
import { Link, useParams } from "react-router-dom";

import PortfolioForm from "../../components/PortfolioForm";
import { useWork } from "../../data/portfolioStore";

import "../../css/ReMakerPortfolio.css";

export default function ReMakerPortfolioEdit() {
  const { workId } = useParams();
  const work = useWork(workId);

  if (!work) {
    return (
      <section className="rpt">
        <div className="rpt-missing">
          <img src="/images/portfolio/before-tara-chair.jpg" alt="" />
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
