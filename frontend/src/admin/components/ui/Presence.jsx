import React from "react";
import { timeAgo } from "../../utils/format";

const ONLINE_MS = 5 * 60 * 1000;

/* true when the account used the app in the last 5 minutes */
export const isOnline = (account) =>
  Boolean(account?.last_seen_at) &&
  account.status !== "Deleted" &&
  Date.now() - new Date(account.last_seen_at).getTime() < ONLINE_MS;

/* "● Online now" (green) or "Last active 3 h ago" */
export default function Presence({ account }) {
  if (isOnline(account)) {
    return (
      <span className="aup-presence on" title="Used ReOrbit in the last 5 minutes">
        <i aria-hidden="true" /> Online now
      </span>
    );
  }
  return (
    <span className="aup-presence">
      <i aria-hidden="true" /> {account?.last_active ? `Last active ${timeAgo(account.last_active)}` : "Never signed in"}
    </span>
  );
}
