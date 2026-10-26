import React from "react";
import "../../css/states/AdminStates.css";

/* Grey shimmering shapes that stand in for content while a page loads.
   They copy the real layout so nothing jumps when the page appears. */
export function Skel({ w, h = 14, r = 8, className = "", style }) {
  return <span className={`sk ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />;
}

const Cards = ({ n = 4 }) => (
  <div className="sk-cards">
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className="sk-card"><Skel w={40} h={40} r={12} /><div><Skel w="55%" h={11} /><Skel w="35%" h={22} r={6} /></div></div>
    ))}
  </div>
);

const Table = ({ rows = 8, cols = 5 }) => (
  <div className="sk-panel">
    <div className="sk-toolbar"><Skel w="38%" h={40} r={12} /><Skel w={110} h={40} r={12} /><Skel w={110} h={40} r={12} /></div>
    <div className="sk-table">
      <div className="sk-row sk-head">{Array.from({ length: cols }, (_, i) => <Skel key={i} w="60%" h={10} />)}</div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="sk-row">
          <div className="sk-first"><Skel w={38} h={38} r={11} /><div><Skel w="70%" h={12} /><Skel w="45%" h={10} /></div></div>
          {Array.from({ length: cols - 1 }, (_, i) => <Skel key={i} w={i === cols - 2 ? 70 : "65%"} h={i === cols - 2 ? 22 : 12} r={i === cols - 2 ? 99 : 8} />)}
        </div>
      ))}
    </div>
  </div>
);

const Detail = () => (
  <>
    <div className="sk-hero"><Skel w={72} h={72} r={20} /><div><Skel w="38%" h={22} /><Skel w="55%" h={12} /></div></div>
    <div className="sk-two">
      <div className="sk-stack">
        {[0, 1, 2].map((i) => <div key={i} className="sk-panel sk-pad"><Skel w="30%" h={16} /><Skel w="60%" h={11} /><Skel w="100%" h={11} /><Skel w="86%" h={11} /><Skel w="72%" h={11} /></div>)}
      </div>
      <div className="sk-stack">
        {[0, 1].map((i) => <div key={i} className="sk-panel sk-pad"><Skel w="40%" h={16} /><Skel w="100%" h={44} r={12} /><Skel w="100%" h={44} r={12} /><Skel w="100%" h={44} r={12} /></div>)}
      </div>
    </div>
  </>
);

const Dashboard = () => (
  <>
    <div className="sk-banner"><Skel w="34%" h={26} /><Skel w="52%" h={12} /><Skel w={140} h={40} r={12} /></div>
    <Cards n={4} />
    <div className="sk-two">
      <div className="sk-panel sk-pad"><Skel w="30%" h={16} /><Skel w="100%" h={230} r={14} /></div>
      <div className="sk-panel sk-pad"><Skel w="40%" h={16} />{[0, 1, 2, 3].map((i) => <Skel key={i} w="100%" h={48} r={12} />)}</div>
    </div>
  </>
);

const Form = () => (
  <div className="sk-panel sk-pad sk-form">
    <Skel w="26%" h={18} />
    {[0, 1, 2, 3].map((i) => <div key={i}><Skel w="22%" h={11} /><Skel w="100%" h={42} r={12} /></div>)}
  </div>
);

/* variant: "dashboard" | "list" | "detail" | "form" | "generic" */
export function PageSkeleton({ variant = "generic" }) {
  return (
    <div className="sk-page" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {variant === "dashboard" && <Dashboard />}
      {variant === "list" && <><Cards n={5} /><Table /></>}
      {variant === "detail" && <Detail />}
      {variant === "form" && <Form />}
      {variant === "generic" && <><Cards n={4} /><Table rows={5} cols={4} /></>}
    </div>
  );
}

/* Pick a skeleton that looks like the page being opened. */
export function variantForPath(path = "") {
  if (path === "/admin-dashboard") return "dashboard";
  if (/^\/admin-(settings|team|help|content)$/.test(path) || /\/(new|edit\/[^/]+)$/.test(path) || path.includes("checkout")) return "form";
  if (/^\/admin-[a-z]+\/[^/]+/.test(path) && !/\/(teams|sales|orders|cart)$/.test(path)) return "detail";
  if (/^\/admin-[a-z-]+(\/(teams|sales|orders))?$/.test(path)) return "list";
  return "generic";
}

export { Cards as SkeletonCards, Table as SkeletonTable };
export default PageSkeleton;
