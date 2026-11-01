/* =========================================================
   Shared › Account status.
   Admin sets Active / Suspended / Blocked / Deleted. Both apps
   read it here:
   - Active     → nothing changes
   - Suspended  → can look around, cannot buy, sell, post or save
   - Blocked / Deleted → locked out with the reason and a way to appeal
   ========================================================= */

import { useMyUserAccount, useMyRemakerAccount } from "./identity";

export const READ_ONLY = ["Suspended"];
export const LOCKED = ["Blocked", "Deleted"];

function summarise(account, kind) {
  if (!account) return { status: "Active", reason: "", at: "", readOnly: false, locked: false, account: null, kind };
  const last = (account.statusHistory || []).find((h) => h.action === account.status);
  return {
    status: account.status,
    reason: last?.reason && last.reason !== "No reason provided." ? last.reason : "",
    at: last?.at || account.updated_at || "",
    readOnly: READ_ONLY.includes(account.status),
    locked: LOCKED.includes(account.status),
    account,
    kind,
  };
}

export const useUserAccountStatus = () => summarise(useMyUserAccount(), "user");
export const useRemakerAccountStatus = () => summarise(useMyRemakerAccount(), "remaker");
