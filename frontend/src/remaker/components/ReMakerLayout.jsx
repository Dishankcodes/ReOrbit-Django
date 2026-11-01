import React, { useState } from "react";
import { Outlet } from "react-router-dom";

import ReMakerSidebar from "./ReMakerSidebar";
import ReMakerHeader from "./ReMakerHeader";
import AccountGate from "../../shared/components/AccountGate";
import { useRemakerAccountStatus } from "../../shared/accountStatus";
import AnnouncementSync from "../../shared/components/AnnouncementSync";
import { syncAnnouncements } from "../data/notificationsStore";

import "./ReMakerLayout.css";

export default function ReMakerLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const account = useRemakerAccountStatus();

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
            <Outlet />
          </AccountGate>
        </main>
      </div>
    </div>
  );
}
