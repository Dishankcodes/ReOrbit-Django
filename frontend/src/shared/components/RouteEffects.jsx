import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { warmSide } from "../lazyPage";
import "./RouteEffects.css";

const sideOf = (path) =>
  (/^\/(user|remaker|admin)/.exec(path) || [null, "public"])[1];

/* A thin bar at the top while the next page loads, plus quiet background loading of the rest of
   the side. Pure overlay: it never changes any page layout or theme. */
export default function RouteEffects() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [bar, setBar] = useState({ on: false, done: false });
  const timer = useRef(0);
  const last = useRef(pathname);
  const before = useRef({ path: "", search: "" });

  useEffect(() => {
    /* Listens in the bubbling phase, after React Router's own <Link> has had its turn:
       - a <Link> already handled its click (defaultPrevented): we only start the bar;
       - a plain <a href="/page"> would reload the whole app, so it is turned into a normal
         in-app navigation. Same page, new tab, downloads, files and API paths are left alone. */
    /* where we were when the click happened (a <Link> has already moved the address bar by the time we see it) */
    const onDown = () => {
      before.current = {
        path: window.location.pathname,
        search: window.location.search,
      };
    };
    const onClick = (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = e.target.closest && e.target.closest("a[href]");
      if (
        !a ||
        (a.target && a.target !== "_self") ||
        a.hasAttribute("download")
      )
        return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === before.current.path &&
        url.search === before.current.search
      )
        return;
      if (
        /^\/(api|uploads|media|static|assets)\//.test(url.pathname) ||
        /\.[a-z0-9]{2,5}$/i.test(url.pathname)
      )
        return;
      if (!e.defaultPrevented) {
        e.preventDefault();
        navigate(url.pathname + url.search + url.hash);
      }
      if (url.pathname !== before.current.path) {
        clearTimeout(timer.current);
        setBar({ on: true, done: false });
        timer.current = setTimeout(
          () => setBar({ on: false, done: false }),
          8000,
        ); /* never stuck */
      }
    };
    document.addEventListener("click", onDown, true);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onDown, true);
      document.removeEventListener("click", onClick);
      clearTimeout(timer.current);
    };
  }, [navigate]);

  useEffect(() => {
    if (last.current !== pathname) {
      last.current = pathname;
      clearTimeout(timer.current);
      setBar((b) => (b.on ? { on: true, done: true } : b));
      timer.current = setTimeout(() => setBar({ on: false, done: false }), 260);
    }
    const t = setTimeout(() => warmSide(sideOf(pathname)), 1500);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!bar.on) return null;
  return (
    <div
      className={`ro-topbar ${bar.done ? "done" : ""}`}
      role="progressbar"
      aria-label="Loading page"
    />
  );
}
