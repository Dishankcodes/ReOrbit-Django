/* =========================================================
   Shared › Who is logged in (demo).
   The User and ReMaker apps keep their own profile in
   localStorage. This file finds the matching account the admin
   manages (by email), so account status, item verification and
   admin actions reach the right person.
   No match → a default demo account. Backend later: the API
   returns the account straight away.
   ========================================================= */

import { useUsers } from "../admin/data/usersStore";
import { useRemakers } from "../admin/data/remakersStore";

export const DEMO_USER_ID = "USR-1002";
export const DEMO_REMAKER_ID = "RMK-2002";

function stored(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || {};
  } catch {
    return {};
  }
}
const same = (a, b) =>
  !!a &&
  !!b &&
  String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

export function useMyUserAccount() {
  const users = useUsers();
  const email = stored("reorbit_user").email;
  return (
    users.find((u) => same(u.email, email)) ||
    users.find((u) => u.user_id === DEMO_USER_ID) ||
    null
  );
}

export function useMyRemakerAccount() {
  const remakers = useRemakers();
  const email = stored("reorbit_remaker").email;
  return (
    remakers.find((r) => same(r.email, email)) ||
    remakers.find((r) => r.remaker_id === DEMO_REMAKER_ID) ||
    null
  );
}

/* Same lookup without a hook, for stores that live outside React. */
import { getUsers } from "../admin/data/usersStore";
export function getMyUserAccount() {
  const email = stored("reorbit_user").email;
  const users = getUsers();
  return (
    users.find((u) => same(u.email, email)) ||
    users.find((u) => u.user_id === DEMO_USER_ID) ||
    null
  );
}
