import React, { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Eye, Lock, ShieldOff, WifiOff, X } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { useAccess, moduleForPath, MODULES, setPreview } from "../data/teamStore";
import useToast from "./ui/useToast";
import AdminErrorBoundary from "./AdminErrorBoundary";
import { PageSkeleton, variantForPath } from "./ui/Skeleton";
import "./AdminLayout.css";

/* Buttons that change data. In view-only mode these are blocked (and dimmed by CSS).
   Anything marked data-safe, and plain links, still work. */
const WRITE_SELECTOR = ".ad-btn-primary, .ad-btn-danger, .ad-btn-warning, .ad-modal-actions button[type='submit'], .sh-big";
const WRITE_VERB = /^(accept|reject|approve|decline|delete|remove|block|unblock|suspend|activate|re-?activate|reopen|cancel|confirm|save|update|create|add|publish|submit|send|schedule|reschedule|assign|ship|mark|refund|restore|revoke|credit|adjust|release|refurbish|unlist|pause|resume|issue|complete|deliver|return|edit|post|place|pay|buy|checkout|announce|dismiss|undo|snooze|promote|cut|archive|verify|flag|resolve|accept|warn|log|start|hide|dismiss|move|make|pause|resume|create)\b/i;
const SAFE_LABEL = /^(mark.*read|view|open|details|download|export|copy)\b/i;
const SAFE_MENU = /^(view|open|see|details|copy|download|export|track|print)/i;

function NoAccess({ moduleKey, onHome, isSuper }) {
  const label = moduleKey === "team" ? "Team & Roles" : MODULES.find((m) => m.key === moduleKey)?.label || "this page";
  return (
    <div className="admin-noaccess">
      <span><ShieldOff size={28} /></span>
      <h2>You don’t have access to {label}</h2>
      <p>
        {moduleKey === "team" && !isSuper
          ? "Only the super admin can add team members and change permissions."
          : "Your role doesn’t include this part of the admin. Ask the super admin if you need it."}
      </p>
      <button type="button" className="ad-btn ad-btn-primary" onClick={onHome}>Back to dashboard</button>
    </div>
  );
}

export default function AdminLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const access = useAccess();
  const { toast, toastNode } = useToast();
  const mainRef = useRef(null);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  const [backOnline, setBackOnline] = useState(false);

  /* Tell people when the connection drops, and when it comes back. */
  useEffect(() => {
    let timer;
    const down = () => { setOnline(false); setBackOnline(false); };
    const up = () => { setOnline(true); setBackOnline(true); clearTimeout(timer); timer = setTimeout(() => setBackOnline(false), 3500); };
    window.addEventListener("offline", down);
    window.addEventListener("online", up);
    return () => { window.removeEventListener("offline", down); window.removeEventListener("online", up); clearTimeout(timer); };
  }, []);

  const moduleKey = moduleForPath(location.pathname);
  const level = moduleKey ? access.level(moduleKey) : "edit";
  const blocked = moduleKey && level === "none";
  const readOnly = moduleKey && moduleKey !== "dashboard" && level === "view";

  // Toggle sidebar.
  const toggleSidebar = () => {
    if (window.innerWidth <= 900) {
      setMobileSidebarOpen((current) => !current);
      return;
    }
    setSidebarCollapsed((current) => !current);
  };

  // Close mobile sidebar.
  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  /* View-only: stop clicks that would change data. (Front-end guard only.) */
  useEffect(() => {
    if (!readOnly) return undefined;
    const guard = (event) => {
      const btn = event.target.closest?.("button");
      if (!btn || btn.closest("[data-safe], [role=tablist], .ad-modal-close")) return;
      const text = (btn.getAttribute("aria-label") || btn.textContent || "").trim();
      const isMenuWrite = btn.getAttribute("role") === "menuitem" && !SAFE_MENU.test(text);
      const isVerb = WRITE_VERB.test(text) && !SAFE_LABEL.test(text);
      if (isMenuWrite || isVerb || btn.matches(WRITE_SELECTOR)) {
        event.preventDefault();
        event.stopPropagation();
        toast("View only. You don’t have edit access here.");
      }
    };
    document.addEventListener("click", guard, true);
    return () => document.removeEventListener("click", guard, true);
  }, [readOnly, toast]);

  return (
    <div
      className={`admin-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${mobileSidebarOpen ? "mobile-sidebar-open" : ""} ${readOnly ? "is-readonly" : ""}`}
    >
      <AdminSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
      />
      {mobileSidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-overlay"
          onClick={closeMobileSidebar}
          aria-label="Close navigation"
        />
      )}
      <div className="admin-layout-main">
        <AdminHeader
          onToggleSidebar={toggleSidebar}
          onCloseMobile={closeMobileSidebar}
        />
        {access.previewing && (
          <div className="admin-preview-bar" role="status">
            <Eye size={16} />
            <span>
              Previewing as <b>{access.previewing.name}</b> ({access.previewing.roleLabel}). This is exactly what they would see.
            </span>
            <button type="button" data-safe onClick={() => { setPreview(null); navigate("/admin-team"); }}>
              <X size={14} /> Exit preview
            </button>
          </div>
        )}
        {!online && (
          <div className="admin-net-bar is-offline" role="alert">
            <WifiOff size={16} />
            <span><b>You are offline.</b> You can keep reading, but changes may not be saved until the connection is back.</span>
          </div>
        )}
        {online && backOnline && (
          <div className="admin-net-bar is-online" role="status"><span><b>Back online.</b> Everything is up to date.</span></div>
        )}
        <main className="admin-page-content" ref={mainRef}>
          {readOnly && (
            <div className="admin-readonly-bar" role="status">
              <Lock size={15} />
              <span><b>View only.</b> You can look at everything here, but buttons that change data are switched off. Ask the super admin for edit access.</span>
            </div>
          )}
          {blocked ? (
            <NoAccess moduleKey={moduleKey} isSuper={access.isSuper} onHome={() => navigate("/admin-dashboard")} />
          ) : (
            <AdminErrorBoundary key={location.pathname}>
              <Suspense fallback={<PageSkeleton variant={variantForPath(location.pathname)} />}>
                {children ?? <Outlet />}
              </Suspense>
            </AdminErrorBoundary>
          )}
        </main>
      </div>
      {toastNode}
    </div>
  );
}
