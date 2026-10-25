import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useSettings } from "../../data/settingsStore";

import AccountSection from "./components/AccountSection";
import DangerSection from "./components/DangerSection";
import NotificationPrefsSection from "./components/NotificationPrefsSection";
import PayoutPrefsSection from "./components/PayoutPrefsSection";
import SecuritySection from "./components/SecuritySection";
import SettingsNav, { SECTIONS } from "./components/SettingsNav";
import StudioSection from "./components/StudioSection";

import "./SettingsPage.css";

export default function ReMakerSettings() {
  const settings = useSettings();
  const [params, setParams] = useSearchParams();

  const requested = params.get("section");
  const active = SECTIONS.some((item) => item.key === requested) ? requested : "account";

  const [dirty, setDirty] = useState({});
  const [toast, setToast] = useState(null); /* { text, undo } */
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  /* Sections report unsaved changes here so the menu can show a dot */
  const reportDirty = useCallback((key, value) => {
    setDirty((current) => (current[key] === value ? current : { ...current, [key]: value }));
  }, []);

  const notify = useCallback((text, undo = null) => {
    clearTimeout(timer.current);
    setToast({ text, undo });
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const select = (key) => {
    const next = new URLSearchParams(params);
    next.set("section", key);
    setParams(next, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const current = SECTIONS.find((item) => item.key === active);
  const unsaved = Object.values(dirty).some(Boolean);

  /* Warn before closing the tab with unsaved changes */
  useEffect(() => {
    if (!unsaved) return undefined;

    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [unsaved]);

  return (
    <section className="set">
      <header className="set-top">
        <div>
          <h2>Settings</h2>
          <p>Manage your account, studio and how ReOrbit keeps in touch with you.</p>
        </div>

        <Link to="/remaker-profile" className="set-btn ghost">
          Edit studio profile
        </Link>
      </header>

      <div className="set-layout">
        <SettingsNav active={active} onSelect={select} dirty={dirty} />

        <div className="set-content">
          <div className="set-heading">
            <h3>{current.label}</h3>
            <p>{current.note}</p>
          </div>

          {/* Every section stays mounted so unsaved changes survive switching tabs */}
          <div hidden={active !== "account"}>
            <AccountSection settings={settings} onDirty={reportDirty} notify={notify} />
          </div>
          <div hidden={active !== "studio"}>
            <StudioSection settings={settings} onDirty={reportDirty} notify={notify} />
          </div>
          <div hidden={active !== "notifications"}>
            <NotificationPrefsSection settings={settings} onDirty={reportDirty} notify={notify} />
          </div>
          <div hidden={active !== "payouts"}>
            <PayoutPrefsSection settings={settings} onDirty={reportDirty} notify={notify} />
          </div>
          <div hidden={active !== "security"}>
            <SecuritySection settings={settings} onDirty={reportDirty} notify={notify} />
          </div>
          <div hidden={active !== "danger"}>
            <DangerSection notify={notify} />
          </div>
        </div>
      </div>

      {toast && (
        <div className="set-toast" role="status" aria-live="polite">
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo();
                setToast(null);
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </section>
  );
}
