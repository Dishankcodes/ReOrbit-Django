import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Lock, LifeBuoy, LogIn } from "lucide-react";
import { readBlock } from "../liveAccountStatus";
import "./AccountGate.css";

const dateOf = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

/* Shown after a blocked (or closed) member or ReMaker is signed out. Public page: no login. */
export default function AccountBlocked() {
  const [params] = useSearchParams();
  const notice = readBlock() || {};
  const role = params.get("as") === "remaker" || notice.role === "remaker" ? "remaker" : "user";
  const deleted = notice.status === "Deleted";
  const contact = role === "remaker" ? "/remakers-contact" : "/contact";
  const signIn = role === "remaker" ? "/remakers-auth" : "/auth";
  return (
    <main className="account-blocked-page">
      <div className="account-lock" role="alert">
        <span className="account-lock-icon">
          <Lock size={30} />
        </span>
        <h1>{deleted ? "This account was closed" : "You are blocked from ReOrbit"}</h1>
        <p>
          {deleted
            ? "The account was closed by the ReOrbit team, so it can no longer be used."
            : "The ReOrbit team has blocked your account, so you've been signed out and can't use it right now."}
        </p>
        {notice.reason && (
          <blockquote>
            <small>Reason{notice.at ? ` · ${dateOf(notice.at)}` : ""}</small>
            {notice.reason}
          </blockquote>
        )}
        <p className="account-lock-help">Think this is a mistake? Contact the ReOrbit team and we'll take another look.</p>
        <div className="account-lock-actions">
          <Link to={contact} className="account-gate-btn primary">
            <LifeBuoy size={16} /> Contact ReOrbit
          </Link>
          <Link to={signIn} className="account-gate-btn">
            <LogIn size={16} /> Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
