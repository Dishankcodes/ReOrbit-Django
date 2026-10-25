import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Eye, UserRound } from "lucide-react";
import { getProductActions } from "../../../data/productActions";
import { ACTION_ICONS } from "../../../components/ui/actionIcons";

/* "…" menu for a listing. Drawn in a portal so the table never clips it. */
export default function ProductActionMenu({
  product,
  onView,
  onOwner,
  onAction,
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const actions = getProductActions(product);

  useLayoutEffect(() => {
    if (!open) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const h = menuRef.current?.offsetHeight || 190;
    const top =
      window.innerHeight - rect.bottom < h + 12
        ? rect.top - h - 6
        : rect.bottom + 6;
    setCoords({ top, left: Math.max(12, rect.right - 214) });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === "keydown" && e.key !== "Escape") return;
      if (
        e.type === "mousedown" &&
        (menuRef.current?.contains(e.target) ||
          buttonRef.current?.contains(e.target))
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
        aria-label={`Actions for ${product.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
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
            onClick={(e) => e.stopPropagation()}
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
              <Eye size={15} /> View details
            </button>
            <button
              type="button"
              role="menuitem"
              className="au-menu-item"
              onClick={() => {
                setOpen(false);
                onOwner();
              }}
            >
              <UserRound size={15} /> View{" "}
              {product.owner.role === "User" ? "user" : "ReMaker"}
            </button>
            {actions.length > 0 && <div className="au-menu-sep" />}
            {actions.map((a) => {
              const Icon = ACTION_ICONS[a.icon];
              return (
                <button
                  key={a.key}
                  type="button"
                  role="menuitem"
                  className={`au-menu-item tone-${a.tone}`}
                  onClick={() => {
                    setOpen(false);
                    onAction(a);
                  }}
                >
                  <Icon size={15} /> {a.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
