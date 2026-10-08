import React, { useState } from "react";
import {
  Bell,
  ShieldCheck,
  LockKeyhole,
  Eye,
  Mail,
  Trash2,
  Smartphone,
  CheckCircle2,
} from "lucide-react";

import "../../css/UserProfile-css/UserSettings.css";

export default function UserSettings() {
  const [notifications, setNotifications] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);

  const [saved, setSaved] = useState(false);

  const saveSettings = () => {
    localStorage.setItem(
      "reorbit_settings",
      JSON.stringify({
        notifications,
        orderUpdates,
        marketing,
        publicProfile,
      }),
    );

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  return (
    <section className="user-settings-page">
      <div className="settings-header">
        <small>Account preferences</small>

        <h1>Settings</h1>

        <p>
          Control how ReOrbit communicates with you and how your account
          information is presented.
        </p>
      </div>

      <div className="settings-layout">
        <nav className="settings-navigation">
          <button type="button" className="active">
            <Bell size={15} />
            Notifications
          </button>

          <button type="button">
            <ShieldCheck size={15} />
            Privacy
          </button>

          <button type="button">
            <LockKeyhole size={15} />
            Security
          </button>

          <button type="button">
            <Eye size={15} />
            Visibility
          </button>
        </nav>

        <div className="settings-panel">
          <div className="settings-panel-header">
            <small>Preferences</small>

            <h2>Notification settings</h2>
          </div>

          <div className="settings-row">
            <div className="settings-row-icon">
              <Bell size={17} />
            </div>

            <div>
              <strong>Push notifications</strong>

              <small>
                Receive important ReOrbit updates and activity alerts.
              </small>
            </div>

            <button
              type="button"
              className={`settings-toggle ${notifications ? "active" : ""}`}
              onClick={() => setNotifications((current) => !current)}
              aria-label="Toggle notifications"
            >
              <span />
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-row-icon">
              <PackageIcon />
            </div>

            <div>
              <strong>Order updates</strong>

              <small>Get notified when your order changes status.</small>
            </div>

            <button
              type="button"
              className={`settings-toggle ${orderUpdates ? "active" : ""}`}
              onClick={() => setOrderUpdates((current) => !current)}
              aria-label="Toggle order updates"
            >
              <span />
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-row-icon">
              <Mail size={17} />
            </div>

            <div>
              <strong>ReOrbit updates</strong>

              <small>
                Occasionally receive sustainability stories, offers and platform
                updates.
              </small>
            </div>

            <button
              type="button"
              className={`settings-toggle ${marketing ? "active" : ""}`}
              onClick={() => setMarketing((current) => !current)}
              aria-label="Toggle marketing"
            >
              <span />
            </button>
          </div>

          <div className="settings-panel-header" style={{ marginTop: 20 }}>
            <small>Visibility</small>

            <h2>Profile privacy</h2>
          </div>

          <div className="settings-row">
            <div className="settings-row-icon">
              <Eye size={17} />
            </div>

            <div>
              <strong>Public profile</strong>

              <small>
                Allow other community members to view your basic ReOrbit
                profile.
              </small>
            </div>

            <button
              type="button"
              className={`settings-toggle ${publicProfile ? "active" : ""}`}
              onClick={() => setPublicProfile((current) => !current)}
              aria-label="Toggle public profile"
            >
              <span />
            </button>
          </div>

          <div className="settings-panel-header" style={{ marginTop: 20 }}>
            <small>Security</small>

            <h2>Account security</h2>
          </div>

          <div className="settings-row">
            <div className="settings-row-icon">
              <Smartphone size={17} />
            </div>

            <div>
              <strong>Two-step verification</strong>

              <small>Add an additional security layer to your account.</small>
            </div>

            <button type="button" className="settings-select">
              Set up
            </button>
          </div>

          <button
            type="button"
            className="profile-save-btn"
            style={{
              marginTop: 20,
              minHeight: 40,
              padding: "0 15px",
              border: 0,
              borderRadius: 9,
              background: "#2a4d3a",
              color: "#fff",
              fontSize: 8,
              fontWeight: 800,
            }}
            onClick={saveSettings}
          >
            <CheckCircle2
              size={13}
              style={{
                marginRight: 6,
                verticalAlign: "middle",
              }}
            />
            Save preferences
          </button>

          {saved && (
            <span
              style={{
                marginLeft: 10,
                color: "#39734f",
                fontSize: 8,
                fontWeight: 700,
              }}
            >
              Saved successfully
            </span>
          )}

          <div className="settings-danger">
            <h3>Delete account</h3>

            <p>
              Permanently remove your ReOrbit account and associated personal
              information. This action should only be used when you are certain.
            </p>

            <button
              type="button"
              onClick={() =>
                window.alert(
                  "Account deletion UI is ready. Backend deletion will be connected later.",
                )
              }
            >
              <Trash2
                size={12}
                style={{
                  marginRight: 5,
                  verticalAlign: "middle",
                }}
              />
              Delete account
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PackageIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m16.5 9.4-9-5.19" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.27 6.96 8.73 5.05 8.73-5.05" />
      <path d="M12 22.08V12" />
    </svg>
  );
}
