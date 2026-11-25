/* Is someone actually using this tab right now?

   Background checks (notifications, messages, support badge, dashboards, account status) only run
   while the answer is yes. A tab that is hidden, or open but untouched for IDLE_MS, makes no calls
   at all, so the server on Render can sleep and the Neon database can scale to zero when nobody is
   around. The moment the person comes back (moves the mouse, types, taps, scrolls or returns to the
   tab), "reorbit:active" fires once and every store refreshes straight away. */

const IDLE_MS = 5 * 60 * 1000;
export const ACTIVE_EVENT = "reorbit:active";

let lastInput = Date.now();
let wasActive = true;
let started = false;

const visible = () => typeof document === "undefined" || document.visibilityState !== "hidden";

export function isActive() {
  return visible() && Date.now() - lastInput < IDLE_MS;
}

function back() {
  if (!wasActive && isActive()) window.dispatchEvent(new Event(ACTIVE_EVENT));
  wasActive = isActive();
}

function onInput() {
  lastInput = Date.now();
  back();
}

export function startActivityWatch() {
  if (started || typeof window === "undefined") return;
  started = true;
  const opts = { passive: true, capture: true };
  ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"].forEach((e) =>
    window.addEventListener(e, onInput, opts),
  );
  window.addEventListener("focus", onInput);
  document.addEventListener("visibilitychange", () => {
    if (visible()) lastInput = Date.now();
    back();
  });
  /* notice going idle, so the next touch counts as coming back */
  window.setInterval(() => {
    wasActive = isActive();
  }, 30 * 1000);
}

/* Run fn when the person comes back to the tab. Returns an unsubscribe function. */
export function onActive(fn) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ACTIVE_EVENT, fn);
  return () => window.removeEventListener(ACTIVE_EVENT, fn);
}

startActivityWatch();
