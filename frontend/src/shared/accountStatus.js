/* =========================================================
   Shared › Account status.
   Admin sets Active / Suspended / Blocked / Deleted (Admin › Users / ReMakers, or a complaint
   decision). Both apps read the real value from the server here:
   - Active     → nothing changes
   - Suspended  → can look around, cannot buy, sell, post or save (support still works)
   - Blocked / Deleted → signed out and shown the reason with a way to contact us
   ========================================================= */

import { useLiveAccountStatus } from "./liveAccountStatus";

export const READ_ONLY = ["Suspended"];
export const LOCKED = ["Blocked", "Deleted"];

function summarise(live, kind) {
  const status = live?.status || "Active";
  return {
    status,
    reason: live?.reason || "",
    at: live?.at || "",
    readOnly: READ_ONLY.includes(status),
    locked: LOCKED.includes(status),
    account: live,
    kind,
  };
}

export const useUserAccountStatus = () => summarise(useLiveAccountStatus("user"), "user");
export const useRemakerAccountStatus = () => summarise(useLiveAccountStatus("remaker"), "remaker");
