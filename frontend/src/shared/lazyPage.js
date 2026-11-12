import { lazy } from "react";

/* Lazy-loaded pages, remembered by side so the browser can fetch the rest of the side the
   visitor is already in while it is idle. The first screen stays small; later page
   switches then find their code already downloaded. */
const registry = { public: [], user: [], remaker: [], admin: [] };
const warmed = new Set();

export function page(group, loader) {
  registry[group].push(loader);
  return lazy(loader);
}

const saveData = () => {
  const c = typeof navigator !== "undefined" ? navigator.connection : null;
  return (
    !!c &&
    (c.saveData ||
      /(^|-)2g$/.test(c.effectiveType || "") ||
      c.effectiveType === "3g")
  );
};

const idle = (fn) =>
  typeof requestIdleCallback === "function"
    ? requestIdleCallback(fn, { timeout: 4000 })
    : setTimeout(fn, 800);

/* One page at a time, only when the browser is idle, never on a slow or data-saving connection. */
export function warmSide(group) {
  if (!registry[group] || warmed.has(group) || saveData()) return;
  warmed.add(group);
  const queue = [...registry[group]];
  const next = () => {
    const loader = queue.shift();
    if (!loader) return;
    loader()
      .catch(() => {})
      .finally(() => idle(next));
  };
  idle(next);
}
