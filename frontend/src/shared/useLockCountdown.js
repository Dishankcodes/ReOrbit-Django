/* =========================================================
   Sign-in pause after too many wrong attempts.

   The server answers 429 with code LOGIN_LOCKED and retry_after (seconds) once an email has had
   5 wrong passwords (or codes). This keeps the sign-in button disabled with a live countdown, so
   people see how long to wait instead of retrying blindly.

     const lock = useLockCountdown();
     try { ... } catch (err) { if (lock.fromError(err)) return; ... }
     <button disabled={lock.active}>{lock.active ? `Try again in ${lock.label}` : "Sign in"}</button>
   ========================================================= */

import { useCallback, useEffect, useState } from "react";

export function formatWait(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function useLockCountdown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!until) return undefined;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= until) {
        setUntil(0);
        clearInterval(t);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [until]);

  /* true when the error was a sign-in pause (the countdown has started) */
  const fromError = useCallback((err) => {
    const wait = Number(err?.data?.retry_after);
    if (err?.code !== "LOGIN_LOCKED" || !wait) return false;
    const n = Date.now();
    setNow(n);
    setUntil(n + wait * 1000);
    return true;
  }, []);

  const left = until ? Math.max(0, (until - now) / 1000) : 0;
  return { active: left > 0, seconds: left, label: formatWait(left), fromError };
}
