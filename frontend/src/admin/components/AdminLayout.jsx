import React, { useState } from "react";
import { Outlet } from "react-router-dom";

import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

import "./AdminLayout.css";

export default function AdminLayout() {
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
      className={`admin-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${
        mobileSidebarOpen ? "mobile-sidebar-open" : ""
      }`}
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

        <main className="admin-page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
