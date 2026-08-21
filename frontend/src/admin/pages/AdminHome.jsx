import React from "react";
import AdminNavbar from "../components/AdminNavbar";
import AdminFooter from "../components/AdminFooter";
import "../css/Home.css";

export default function AdminHome() {
  return (
    <div className="admin-home-container">
      <AdminNavbar />

      <main className="main-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-text-container">
            <span className="hero-badge">REORBIT MANAGEMENT</span>
            <h1 className="hero-title">
              Keeping the <span className="font-bricolage">ReOrbit</span>{" "}
              moving.
            </h1>
            <p className="hero-description">
              The central nervous system for coordinating people, processes, and
              purposeful restoration. Manage the lifecycle of every object and
              the artisans who give them a second life.
            </p>
            <div className="hero-actions">
              <button className="btn-primary">Admin Login</button>
              <button className="btn-secondary">Explore ReOrbit</button>
            </div>
          </div>

          <div className="hero-image-container">
            <div className="hero-image-wrapper">
              <img
                src="https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=800"
                alt="Tools and Workspace"
                className="hero-img"
              />
              <div className="overlay-badge top-right">
                <span className="badge-icon">♻</span>
                <div>
                  <div className="badge-value">8,921</div>
                  <div className="badge-label">ITEMS REUSED</div>
                </div>
              </div>
              <div className="overlay-badge bottom-left">
                <span className="badge-icon">👥</span>
                <div>
                  <div className="badge-value">48</div>
                  <div className="badge-label">ACTIVE ARTISTS</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Process Flow Bar */}
        <section className="process-section">
          <h3 className="process-title">
            One platform. Every stage of the journey.
          </h3>
          <div className="process-steps">
            <span className="step-pill">Users</span>
            <span className="arrow">➔</span>
            <span className="step-pill">Items</span>
            <span className="arrow">➔</span>
            <span className="step-pill">Artists</span>
            <span className="arrow">➔</span>
            <span className="step-pill">Refurbishment</span>
            <span className="arrow">➔</span>
            <span className="step-pill">Warehouse</span>
            <span className="arrow">➔</span>
            <span className="step-pill">New Owners</span>
          </div>
        </section>
      </main>

      <AdminFooter />
    </div>
  );
}
