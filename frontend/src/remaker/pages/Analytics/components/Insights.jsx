import React from "react";
import { Link } from "react-router-dom";

import { fmtNumber, fmtPercent, formatPrice } from "./format";

/* Turn the numbers into plain advice. Every card links to the place to act. */
function buildInsights(data) {
  const list = [];
  const { products, heatmap, sources, cities, current } = data;

  if (products.length) {
    const best = products[0];
    const share = current.revenue ? (best.revenue / current.revenue) * 100 : 0;

    list.push({
      tone: "good",
      tag: "Best seller",
      title: `${best.title} is carrying your studio`,
      text: `It earned ${formatPrice(best.revenue)}, which is ${share.toFixed(0)}% of everything you made in this period. Keep it in stock and feature it first.`,
      action: { label: "Open product", to: `/remaker-products/${best.id}/edit` },
    });

    const gap = [...products]
      .filter((item) => item.views > 0)
      .sort((a, b) => b.views / (b.orders + 1) - a.views / (a.orders + 1))[0];

    if (gap) {
      list.push({
        tone: "warn",
        tag: "Room to grow",
        title: `${gap.title} gets looked at but rarely bought`,
        text: `${fmtNumber(gap.views)} people viewed it and only ${fmtPercent(gap.conv, 2)} ordered. A brighter cover photo, a clearer story or a small price change often helps.`,
        action: { label: "Improve listing", to: `/remaker-products/${gap.id}/edit` },
      });
    }
  }

  list.push({
    tone: "info",
    tag: "Timing",
    title: `${heatmap.best.day} at ${heatmap.best.block} is your busiest time`,
    text: "More customers order then. Publish new products and reply to messages just before this window to catch them.",
    action: { label: "Add a product", to: "/remaker-products/new" },
  });

  const feed = sources.find((item) => item.key === "feed");
  if (feed) {
    list.push({
      tone: "info",
      tag: "Followers",
      title: `${fmtPercent(feed.percent, 0)} of your views come from followers`,
      text: "Posting a before and after in your portfolio shows up in their feed and brings them back to your shop.",
      action: { label: "Add portfolio work", to: "/remaker-portfolio/new" },
    });
  }

  const city = cities[0];
  if (city) {
    list.push({
      tone: "good",
      tag: "Your buyers",
      title: `${city.city} is your biggest market`,
      text: `About ${fmtPercent(city.percent, 0)} of orders come from there. Mention local pickup in your descriptions to win more of them.`,
      action: { label: "See customers", to: "/remaker-customers" },
    });
  }

  return list.slice(0, 4);
}

export default function Insights({ data }) {
  const insights = buildInsights(data);

  return (
    <section className="ana-insights">
      <header className="ana-section-head">
        <h3>What to do next</h3>
        <p>Simple ideas based on your numbers</p>
      </header>

      <div className="ana-insight-grid">
        {insights.map((item) => (
          <article className={`ana-insight ${item.tone}`} key={item.title}>
            <span>{item.tag}</span>
            <h4>{item.title}</h4>
            <p>{item.text}</p>
            <Link to={item.action.to}>{item.action.label} →</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
