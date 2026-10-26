import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import UserSidebar from "./UserSidebar";
import UserHeader from "./UserHeader";

import "./UserLayout.css";

export default function UserLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const location = useLocation();

  // Reset scroll position whenever the user navigates to another route.
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });

    // Also reset the page container if it becomes a scroll container.
    const pageContent = document.querySelector(".user-page-content");

    if (pageContent) {
      pageContent.scrollTop = 0;
      pageContent.scrollLeft = 0;
    }
  }, [location.pathname, location.search]);

  const toggleSidebar = () => {
    if (window.innerWidth <= 900) {
      setMobileSidebarOpen((current) => !current);
      return;
    }

    setSidebarCollapsed((current) => !current);
  };

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
