import React, { useEffect, useState } from "react";
import "./Skeleton.css";

/* =========================================================
   Loading placeholders for long lists.
   Today the data is in memory, so useLoading() shows the skeleton for a
   short moment on first open. With the backend, return the request's
   isLoading flag from the same hook and nothing else changes.
   ========================================================= */

export function useLoading(ms = 450) {
  const [loading, setLoading] = useState(ms > 0);
  useEffect(() => {
    if (ms <= 0) return undefined;
    const t = window.setTimeout(() => setLoading(false), ms);
    return () => window.clearTimeout(t);
  }, [ms]);
  return loading;
}

export function Skel({ w = "100%", h = 14, r = 8, style }) {
  return <span className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />;
}

/* A grid of product-card skeletons */
export function SkeletonCards({ count = 8, min = 250 }) {
  return (
    <div className="sk-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div className="sk-card" key={i}>
          <Skel h={170} r={14} />
          <Skel w="40%" h={10} />
          <Skel w="85%" h={16} />
          <Skel w="60%" h={12} />
          <div className="sk-row"><Skel w="35%" h={20} /><Skel w="28%" h={32} r={999} /></div>
        </div>
      ))}
    </div>
  );
}

/* A stack of list-row skeletons (orders, tickets, complaints...) */
export function SkeletonRows({ count = 6, avatar = true }) {
  return (
    <div className="sk-rows" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div className="sk-rowitem" key={i}>
          {avatar && <Skel w={52} h={52} r={12} />}
          <div className="sk-lines">
            <Skel w="30%" h={12} />
            <Skel w="62%" h={16} />
            <Skel w="45%" h={11} />
          </div>
          <Skel w={84} h={28} r={999} />
        </div>
      ))}
    </div>
  );
}

/* Table skeleton for admin lists */
export function SkeletonTable({ rows = 8, cols = 5 }) {
  return (
    <div className="sk-table" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div className="sk-tr" key={r} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((__, c) => (
            <Skel key={c} w={c === 0 ? "60%" : "80%"} h={13} />
          ))}
        </div>
      ))}
    </div>
  );
}
