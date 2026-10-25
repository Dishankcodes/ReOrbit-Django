import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Eye } from "lucide-react";
import { getAvailableActions } from "../../../data/userActions";
import { ACTION_ICONS } from "../../../components/ui/actionIcons";

/* "…" menu on every row. It is drawn in a portal so the table's
   scroll area never clips it. */
export default function UserActionMenu({ user, onView, onAction }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const actions = getAvailableActions(user.status);

  const place = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = menuRef.current?.offsetHeight || 190;
    const below = window.innerHeight - rect.bottom;
    const top =
      below < menuHeight + 12 ? rect.top - menuHeight - 6 : rect.bottom + 6;
    setCoords({ top, left: Math.max(12, rect.right - 214) });
  };

  useLayoutEffect(() => {
    if (open) place();
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
        aria-label={`Actions for ${user.full_name}`}
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
            <button
              type="button"
              role="menuitem"
              className="au-menu-item"
              onClick={() => {
                setOpen(false);
                onView();
              }}
            >
              <Eye size={15} /> View profile
            </button>
            <div className="au-menu-sep" />
            {actions.map((action) => {
              const Icon = ACTION_ICONS[action.icon];
              return (
                <button
                  key={action.key}
                  type="button"
                  role="menuitem"
                  className={`au-menu-item tone-${action.tone}`}
                  onClick={() => {
                    setOpen(false);
                    onAction(action);
                  }}
                >
                  <Icon size={15} /> {action.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
