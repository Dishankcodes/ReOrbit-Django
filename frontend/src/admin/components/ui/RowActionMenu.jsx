import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

/* A reusable "…" menu for table rows and cards.
   items: [{ key, label, icon: LucideComponent, tone?, onClick } | "separator"]
   It is drawn in a portal so a scrolling table never clips it. */
export default function RowActionMenu({ label, items }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!open) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const height = menuRef.current?.offsetHeight || 220;
    const top =
      window.innerHeight - rect.bottom < height + 12
        ? rect.top - height - 6
        : rect.bottom + 6;
    setCoords({ top, left: Math.max(12, rect.right - 214) });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (
        event.type === "mousedown" &&
        (menuRef.current?.contains(event.target) ||
          buttonRef.current?.contains(event.target))
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="ad-icon-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MoreHorizontal size={18} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="au-menu"
            role="menu"
            style={{ top: coords.top, left: coords.left }}
            onClick={(event) => event.stopPropagation()}
          >
            {items.map((item, index) => {
              if (item === "separator")
                return <div key={`sep-${index}`} className="au-menu-sep" />;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  className={`au-menu-item ${item.tone ? `tone-${item.tone}` : ""}`}
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                >
                  {Icon && <Icon size={15} />} {item.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
