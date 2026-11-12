/* =========================================================
   One place that knows how a signed-in session is stored.
   Everything else (api.js, login pages, logout buttons,
   RequireAuth) goes through these functions.

   Tokens live in localStorage ("remember me") or in
   sessionStorage (until the tab closes). The signed-in
   account (name, public_id, status ...) is cached under
   reorbit_user / reorbit_remaker / reorbit_admin for the
   headers and sidebars. The server stays the source of
   truth: it checks the token on every request.
   ========================================================= */

const BASE = {
  access: "reorbit_access_token",
  refresh: "reorbit_refresh_token",
  type: "reorbit_account_type",
  id: "reorbit_account_id",
};

const ACCOUNT_KEY = {
  user: "reorbit_user",
  remaker: "reorbit_remaker",
  admin: "reorbit_admin",
};

export const LOGIN_PATH = {
  user: "/auth",
  remaker: "/remakers-auth",
  admin: "/admin-login",
};

export const SESSION_ENDED_EVENT = "reorbit:session-ended";

/* ---------------------------------------------------------
   One session slot PER PORTAL.
   The user, ReMaker and admin sides can be open in different
   tabs of the same browser at the same time. Each side keeps
   its own tokens (reorbit_access_token.user, .remaker, .admin),
   so signing in to one side never touches another side's tab.
   A tab's side comes from its address: /admin... = admin,
   /remaker... = ReMaker, everything else = user.
   --------------------------------------------------------- */
export const portalOf = (pathname) => {
  const p = String(pathname || "");
  if (p.startsWith("/admin")) return "admin";
  if (p.startsWith("/remaker")) return "remaker";
  return "user";
};

const currentPortal = () =>
  typeof window === "undefined" ? "user" : portalOf(window.location.pathname);

const keyFor = (name, type) => `${BASE[name]}.${type}`;
const slotKeys = (type) => [
  keyFor("access", type),
  keyFor("refresh", type),
  keyFor("type", type),
  keyFor("id", type),
  ACCOUNT_KEY[type],
];

// sessionStorage is isolated per tab. Broadcast rotated tokens so tabs of the
// SAME side that share a login keep using the same refresh-token family.
const SESSION_CHANNEL =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("reorbit-auth-session")
    : null;

if (SESSION_CHANNEL) {
  SESSION_CHANNEL.addEventListener("message", (event) => {
    const message = event.data;
    if (message?.type === "tokens" && message.access && message.refresh) {
      const incomingType = decodeToken(message.access)?.account_type;
      // only the tab(s) of the same side take new tokens
      if (incomingType && incomingType === currentPortal()) {
        const s = activeStore(incomingType) || window.sessionStorage;
        write(s, keyFor("access", incomingType), message.access);
        write(s, keyFor("refresh", incomingType), message.refresh);
      }
    } else if (
      message?.type === "logout" &&
      message.account === currentPortal()
    ) {
      clearSession({ broadcast: false });
      window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
    }
  });
}

const stores = () => {
  const list = [];
  try {
    list.push(window.localStorage);
  } catch {
    /* storage blocked */
  }
  try {
    list.push(window.sessionStorage);
  } catch {
    /* storage blocked */
  }
  return list;
};

const read = (store, key) => {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
};

const write = (store, key, value) => {
  try {
    store.setItem(key, value);
  } catch {
    /* storage full or blocked */
  }
};

const remove = (store, key) => {
  try {
    store.removeItem(key);
  } catch {
    /* ignore */
  }
};

/* The storage that currently holds this side's session (or null). */
const activeStore = (type = currentPortal()) =>
  stores().find(
    (s) => read(s, keyFor("access", type)) || read(s, keyFor("refresh", type)),
  ) || null;

/* One-time move of the old single-slot session into its side's slot. */
(function migrateLegacy() {
  stores().forEach((s) => {
    const access = read(s, BASE.access);
    const refresh = read(s, BASE.refresh);
    if (!access && !refresh) return;
    const claim = decodeToken(access || refresh || "");
    const type = claim?.account_type;
    if (ACCOUNT_KEY[type]) {
      if (access) write(s, keyFor("access", type), access);
      if (refresh) write(s, keyFor("refresh", type), refresh);
      const id = read(s, BASE.id);
      if (id) write(s, keyFor("id", type), id);
      write(s, keyFor("type", type), type);
    }
    [BASE.access, BASE.refresh, BASE.type, BASE.id].forEach((k) =>
      remove(s, k),
    );
  });
})();

export const getAccessToken = (type = currentPortal()) => {
  const s = activeStore(type);
  return s ? read(s, keyFor("access", type)) : null;
};

export const getRefreshToken = (type = currentPortal()) => {
  const s = activeStore(type);
  return s ? read(s, keyFor("refresh", type)) : null;
};

/* Reads the payload of a JWT. No signature check: the server does that. */
export function decodeToken(token) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "=")));
  } catch {
    return null;
  }
}

/* "user" | "remaker" | "admin" | null: whose session this tab holds (its own side). */
export const getAccountType = () => {
  const type = currentPortal();
  const claim = decodeToken(
    getAccessToken(type) || getRefreshToken(type) || "",
  );
  return claim?.account_type || null;
};

export const isSignedIn = (type) => {
  const side = type || currentPortal();
  if (!getAccessToken(side) && !getRefreshToken(side)) return false;
  return type ? getAccountType() === type : true;
};

export const getAccount = (type = currentPortal()) => {
  const s = activeStore(type);
  if (!s || !ACCOUNT_KEY[type]) return null;
  try {
    return JSON.parse(read(s, ACCOUNT_KEY[type]) || "null");
  } catch {
    return null;
  }
};

/* Save a new session after login or registration.
   type: "user" | "remaker" | "admin", account: the object the API returned.
   Only that side's slot changes; the other sides stay signed in. */
export function saveSession({
  access,
  refresh,
  type,
  account,
  remember = true,
}) {
  const [primary, other] = remember
    ? [window.localStorage, window.sessionStorage]
    : [window.sessionStorage, window.localStorage];

  // Never leave an old copy of THIS side's session in the other storage.
  slotKeys(type).forEach((k) => remove(other, k));

  write(primary, keyFor("access", type), access);
  write(primary, keyFor("refresh", type), refresh);
  write(primary, keyFor("type", type), type);
  if (account?.public_id) write(primary, keyFor("id", type), account.public_id);
  if (account) write(primary, ACCOUNT_KEY[type], JSON.stringify(account));
  SESSION_CHANNEL?.postMessage({ type: "tokens", access, refresh });
}

/* After a token refresh: keep the session where it already lives. */
export function updateTokens({ access, refresh }) {
  const type = currentPortal();
  const s = activeStore(type) || window.localStorage;
  if (access) write(s, keyFor("access", type), access);
  if (refresh) write(s, keyFor("refresh", type), refresh);
  if (access && refresh)
    SESSION_CHANNEL?.postMessage({ type: "tokens", access, refresh });
}

/* Update the cached account (for example after a profile edit). */
export const ACCOUNT_UPDATED_EVENT = "reorbit:account-updated";

export function updateAccount(type, account) {
  const s = activeStore(type);
  if (s && ACCOUNT_KEY[type])
    write(s, ACCOUNT_KEY[type], JSON.stringify(account));
  window.dispatchEvent(new Event(ACCOUNT_UPDATED_EVENT));
}

/* Sign out of THIS side only. */
export function clearSession({ broadcast = true } = {}) {
  const type = currentPortal();
  if (broadcast)
    SESSION_CHANNEL?.postMessage({ type: "logout", account: type });
  stores().forEach((s) => slotKeys(type).forEach((k) => remove(s, k)));
}

/* The session is over (refresh failed or the account was removed). */
export function endSession() {
  clearSession();
  window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
}
