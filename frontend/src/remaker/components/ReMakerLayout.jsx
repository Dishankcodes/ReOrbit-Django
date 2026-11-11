import React, { Suspense, useEffect, useState } from "react";
import { DelayedLoader } from "../../shared/components/Spinner";
import { Outlet, useLocation } from "react-router-dom";

import ReMakerSidebar from "./ReMakerSidebar";
import ReMakerHeader from "./ReMakerHeader";
import AccountGate from "../../shared/components/AccountGate";
import { useRemakerAccountStatus } from "../../shared/accountStatus";
import AnnouncementSync from "../../shared/components/AnnouncementSync";
import { syncAnnouncements } from "../data/notificationsStore";

import "./ReMakerLayout.css";
import "../css/remaker-buying-theme.css";

export default function ReMakerLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const location = useLocation();
  const account = useRemakerAccountStatus();

  // Reset scroll whenever the ReMaker navigates to another route.
  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });

      // Also reset the layout's scroll container, if it is scrollable.
      const pageContent = document.querySelector(".remaker-page-content");

      if (pageContent) {
        pageContent.scrollTop = 0;
        pageContent.scrollLeft = 0;
      }
    };

    resetScroll();

    // Run once more after the new route has rendered.
    const frameId = window.requestAnimationFrame(resetScroll);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [location.pathname, location.search]);

  /* =========================================================
     SIDEBAR TOGGLE
     ========================================================= */

  const toggleSidebar = () => {
    if (window.innerWidth <= 900) {
      setMobileSidebarOpen((current) => !current);
      return;
    }

    setSidebarCollapsed((current) => !current);
  };

  /* =========================================================
     CLOSE MOBILE SIDEBAR
     ========================================================= */

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div
      className={`remaker-layout ${
        sidebarCollapsed ? "sidebar-collapsed" : ""
      } ${mobileSidebarOpen ? "mobile-sidebar-open" : ""}`}
    >
      <AnnouncementSync audience="remakers" onSync={syncAnnouncements} />
      <ReMakerSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
      />

      {mobileSidebarOpen && (
        <button
          type="button"
          className="remaker-sidebar-overlay"
          onClick={closeMobileSidebar}
          aria-label="Close navigation"
        />
      )}

      <div className="remaker-layout-main">
        <ReMakerHeader
          onToggleSidebar={toggleSidebar}
          onCloseMobile={closeMobileSidebar}
        />

        <main className="remaker-page-content">
          <AccountGate info={account} role="remaker">
            <Suspense fallback={<DelayedLoader minHeight={320} />}>
              <div className="ro-route">{<Outlet />}</div>
            </Suspense>
          </AccountGate>
        </main>
      </div>
    </div>
  );
}
