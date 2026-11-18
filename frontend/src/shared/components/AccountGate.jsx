/* =========================================================
   Shared › AccountGate
   Wrap the page area of the User or ReMaker layout.
   - Active     → renders the page as normal
   - Suspended  → banner on top; buttons that change things are blocked
   - Blocked / Deleted → a locked screen with the reason and an appeal link
   The server enforces the same rules (apps.accounts.permissions); this only explains them.
   ========================================================= */

import { useEffect, useState } from "react";
import { rememberBlock, resetAccountStatus } from "../liveAccountStatus";
import { signOut } from "../../api/auth";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert, Lock, LogOut, LifeBuoy } from "lucide-react";
import "./AccountGate.css";

const WRITE_VERB =
  /^(add to cart|buy|checkout|place order|pay|sell|list|submit|post|publish|save|send|schedule|donate|redeem|follow|unfollow|create|edit|update|delete|remove|apply|claim|report|write|reply|accept|decline|cancel|confirm|upload|reorder|request|book|message|start|mark|withdraw)\b/i;
const SAFE =
  /^(view|open|details|track|download|print|close|back|next|previous|filter|sort|search|clear|menu|notifications?|log ?out|sign ?out|contact|help)/i;

const dateOf = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

export default function AccountGate({ info, role, children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [note, setNote] = useState("");
  const suspended = info.readOnly;

  /* Support and contact pages keep working while suspended (raising and answering tickets). */
  const supportPage = /(help|contact|support|ticket)/i.test(pathname);

  /* Blocked or closed: sign out at once and show why, with a way to contact us. */
  useEffect(() => {
    if (!info.locked) return;
    rememberBlock({ role, status: info.status, reason: info.reason, at: info.at });
    signOut();
    resetAccountStatus();
    navigate(`/account-blocked?as=${role}`, { replace: true });
  }, [info.locked, info.status, info.reason, info.at, role, navigate]);

  /* Suspended: stop clicks that would change data. */
  useEffect(() => {
    if (!suspended || supportPage) return undefined;
    let timer;
    const guard = (event) => {
      const btn = event.target.closest?.("button, [role=button]");
      if (
        !btn ||
        btn.closest(
          "[data-safe], .account-gate-banner, header, nav, aside, [role=dialog][data-safe]",
        )
      )
        return;
      const text = (
        btn.getAttribute("aria-label") ||
        btn.textContent ||
        ""
      ).trim();
      if (!text || SAFE.test(text) || !WRITE_VERB.test(text)) return;
      event.preventDefault();
      event.stopPropagation();
      setNote(
        "Your account is suspended, so this action is turned off. You can still look around.",
      );
      clearTimeout(timer);
      timer = setTimeout(() => setNote(""), 3200);
    };
    document.addEventListener("click", guard, true);
    return () => {
      document.removeEventListener("click", guard, true);
      clearTimeout(timer);
    };
  }, [suspended, supportPage]);

  const logout = () => {
    signOut();
    navigate(role === "remaker" ? "/remakers-auth" : "/auth", {
      replace: true,
    });
  };
  /* "Contact support" opens a ticket with the topic and title already filled in */
  const prefill = new URLSearchParams({
    category: role === "remaker" ? "Account and security" : "Account or login",
    subject: suspended ? "Please review my account suspension" : "Please review my account",
    message: info.reason ? `My account was ${String(info.status).toLowerCase()} with the reason: "${info.reason}". ` : "",
  }).toString();
  const help = role === "remaker" ? `/remaker-help/new?${prefill}` : `/user-help/contact?${prefill}`;

  /* A locked account can still reach the contact page to appeal. */
  if (info.locked && !pathname.endsWith("/contact")) {
    const deleted = info.status === "Deleted";
    return (
      <div className="account-lock" role="alert">
        <span className="account-lock-icon">
          <Lock size={30} />
        </span>
        <h1>
          {deleted ? "This account was closed" : "This account is blocked"}
        </h1>
        <p>
          {deleted
            ? "The account was deleted, so it can no longer be used."
            : "Our team blocked this account, so you can’t use ReOrbit right now."}
        </p>
        {info.reason && (
          <blockquote>
            <small>Reason{info.at ? ` · ${dateOf(info.at)}` : ""}</small>
            {info.reason}
          </blockquote>
        )}
        <p className="account-lock-help">
          Think this is a mistake? Write to us and we’ll take another look.
        </p>
        <div className="account-lock-actions">
          <button
            type="button"
            data-safe
            className="account-gate-btn primary"
            onClick={() => navigate(help)}
          >
            <LifeBuoy size={16} /> Contact support
          </button>
          <button
            type="button"
            data-safe
            className="account-gate-btn"
            onClick={logout}
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {suspended && (
        <div className="account-gate-banner" role="status">
          <ShieldAlert size={20} />
          <div>
            <strong>Your account is suspended</strong>
            <span>
              You can look around, but buying, selling, posting and saving are
              turned off
              {info.reason ? `. Reason: ${info.reason}` : "."}
            </span>
          </div>
          <button
            type="button"
            data-safe
            className="account-gate-btn"
            onClick={() => navigate(help)}
          >
            Contact support
          </button>
        </div>
      )}
      {children}
      {note && (
        <div className="account-gate-toast" role="status">
          {note}
        </div>
      )}
    </>
  );
}
