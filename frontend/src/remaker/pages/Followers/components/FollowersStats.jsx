import React from "react";

/* Four numbers, a 12 week growth chart and the top cities */
function GrowthChart({ series }) {
  const min = Math.min(...series.map((point) => point.total));
  const max = Math.max(...series.map((point) => point.total), min + 1);
  const span = max - min || 1;

  const x = (i) => (i / (series.length - 1)) * 100;
  const y = (value) => 92 - ((value - min) / span) * 78;
  const points = series
    .map((point, i) => `${x(i)},${y(point.total)}`)
    .join(" ");

  return (
    <div className="fol-growth">
      <div
        className="fol-growth-chart"
        role="img"
        aria-label={`Followers grew from ${series[0].total} to ${series[series.length - 1].total} in 12 weeks`}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="folFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,100 ${points} 100,100`} fill="url(#folFill)" />
          <polyline
            points={points}
            className="line"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="fol-growth-axis">
        <span>{series[0].label}</span>
        <span>{series[Math.floor(series.length / 2)].label}</span>
        <span>{series[series.length - 1].label}</span>
      </div>
    </div>
  );
}

export default function FollowersStats({ stats, series }) {
  const change = stats.previous30
    ? ((stats.last30 - stats.previous30) / stats.previous30) * 100
    : null;

  return (
    <div className="fol-stats">
      <section className="fol-feature">
        <header>
          <small>Total followers</small>
          <strong>{stats.total}</strong>
          <p>
            <b>+{stats.last30}</b> in the last 30 days
            {change !== null && (
              <span className={change >= 0 ? "up" : "down"}>
                {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(0)}%
              </span>
            )}
          </p>
        </header>

        <GrowthChart series={series} />
        <small className="fol-growth-note">
          Followers over the last 12 weeks
        </small>
      </section>

      <div className="fol-tiles">
        <article>
          <small>Have bought from you</small>
          <strong>{stats.customers}</strong>
          <span>
            {stats.total
              ? Math.round((stats.customers / stats.total) * 100)
              : 0}
            % of followers
          </span>
        </article>
        <article>
          <small>Highly engaged</small>
          <strong>{stats.engaged}</strong>
          <span>Viewed or saved a lot</span>
        </article>
        <article>
          <small>Fellow ReMakers</small>
          <strong>{stats.makers}</strong>
          <span>Makers who follow you</span>
        </article>

        <article className="places">
          <small>Top cities</small>
          <ul>
            {stats.places.slice(0, 4).map((place) => (
              <li key={place.city}>
                <span>{place.city}</span>
                <i>
                  <b style={{ width: `${place.percent * 2.6}%` }} />
                </i>
                <em>{place.count}</em>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}
