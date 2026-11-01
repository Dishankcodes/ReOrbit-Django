/* =========================================================
   Shared › Announcements.
   Sent from Admin › Notifications with an audience
   (everyone / users / remakers). Each app shows the ones for it.
   ========================================================= */

import { useMemo } from "react";
import { useAnnouncements } from "../admin/data/notificationsStore";

export function useMyAnnouncements(role /* "users" | "remakers" */) {
  const all = useAnnouncements();
  return useMemo(
    () =>
      all
        .filter(
          (a) =>
            !a.scheduled && (a.audience === "everyone" || a.audience === role),
        )
        .map((a) => ({
          id: `ann-${a.id}`,
          kind: "announcement",
          title: a.title,
          message: a.message,
          type: a.type,
          link: a.link,
          at: a.at,
        })),
    [all, role],
  );
}
