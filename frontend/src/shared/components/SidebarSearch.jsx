import React, { useEffect, useRef, useState } from "react";
import { History, Search } from "lucide-react";
import "./SidebarSearch.css";

/* Menu search for the dark sidebars (member and ReMaker). Same behaviour as the admin one:
   type to filter every link, Enter opens the first match, Esc clears, "/" focuses the box from anywhere,
   and focusing the empty box lists the last few pages you opened.

   useSidebarSearch(items, { storageKey, pathname, navigate, onPicked }) -> { query, results, box }
   `items`: [{ label, path, icon, words? }] (every link in the menu). While `query` is set the sidebar
   shows `results` instead of its normal sections. Render {box} above the navigation. */

const readRecent = (key) => {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

export function useSidebarSearch(items, { storageKey, pathname, navigate, onPicked }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState(() => readRecent(storageKey));
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      const typing =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable);
      if (typing) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* remember the last few menu pages that were opened */
  useEffect(() => {
    const hit = items
      .filter((i) => pathname === i.path || pathname.startsWith(i.path + "/"))
      .sort((a, b) => b.path.length - a.path.length)[0];
    if (!hit) return;
    setRecent((prev) => {
      const next = [hit.path, ...prev.filter((p) => p !== hit.path)].slice(0, 6);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* private mode: the list just won't persist */
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const q = query.trim().toLowerCase();
  const results = q
    ? items.filter((i) =>
        `${i.label} ${i.words || ""}`.toLowerCase().includes(q),
      )
    : [];
  const recentItems = recent
    .filter((p) => p !== pathname)
    .map((p) => items.find((i) => i.path === p))
    .filter(Boolean)
    .slice(0, 4);

  const open = (item) => {
    navigate(item.path);
    setQuery("");
    inputRef.current?.blur();
    onPicked?.();
  };

  const box = (
    <div className="sbs">
      <Search size={15} aria-hidden="true" className="sbs-icon" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setQuery("");
          if (e.key === "Enter" && results[0]) open(results[0]);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search menu…"
        aria-label="Search the menu"
      />
      {!query && !focused && <kbd className="sbs-key">/</kbd>}
      {focused && !query && recentItems.length > 0 && (
        <div className="sbs-recent" role="listbox" aria-label="Recent pages">
          <span className="sbs-recent-label">
            <History size={11} /> RECENT
          </span>
          {recentItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.path}
                className="sbs-recent-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  open(item);
                }}
              >
                {Icon && <Icon size={15} strokeWidth={1.8} />}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return { query, results, box, clear: () => setQuery("") };
}
