import React, { useState } from "react";
import { Outlet } from "react-router-dom";

import UserSidebar from "./UserSidebar";
import UserHeader from "./UserHeader";

import "./UserLayout.css";

export default function UserLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Toggle sidebar depending on screen size.
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

  return (
    <div
      className={`user-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${
        mobileSidebarOpen ? "mobile-sidebar-open" : ""
      }`}
    >
      <UserSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
      />

      {mobileSidebarOpen && (
        <button
          type="button"
          className="user-sidebar-overlay"
          onClick={closeMobileSidebar}
          aria-label="Close navigation"
        />
      )}

      <div className="user-layout-main">
        <UserHeader
          onToggleSidebar={toggleSidebar}
          onCloseMobile={closeMobileSidebar}
        />

        <main className="user-page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
