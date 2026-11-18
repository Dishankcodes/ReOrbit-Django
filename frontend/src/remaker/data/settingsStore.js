/* =========================================================
   ReMaker settings: what lives on the server.
   Notification topics and sign-in alerts are saved on the ReMaker's profile
   (notification_preferences on /api/remakers/profile/). The server reads the same
   switches before it sends a notification, so turning a topic off really stops it.
   Email is only used for sign-in codes, account and security messages.
   ========================================================= */

import { useEffect, useState } from "react";
import { getAccount } from "../../api/session";

/* [key, label, what it covers]. Keys match the server's topics (apps/core/services.PREF_TOPICS). */
export const REMAKER_TOPICS = [
  ["orders", "Sales and orders", "New orders, cancellations, deliveries, returns and payouts"],
  ["reviews", "Reviews", "New reviews of your products and your studio"],
  ["messages", "Messages and followers", "New messages and people who follow you"],
  ["offers", "Offers and announcements", "Coupons and news from ReOrbit"],
];

/* The saved switches, from the signed-in ReMaker's cached profile (refreshed by useMyProfile). */
export function useNotificationPrefs() {
  const read = () => getAccount("remaker")?.profile?.notification_preferences || {};
  const [prefs, setPrefs] = useState(read);
  useEffect(() => {
    const again = () => setPrefs(read());
    window.addEventListener("focus", again);
    window.addEventListener("storage", again);
    return () => {
      window.removeEventListener("focus", again);
      window.removeEventListener("storage", again);
    };
  }, []);
  return prefs;
}
