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

const KEY = {
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

/* The storage that currently holds the session (or null). */
const activeStore = () =>
  stores().find((s) => read(s, KEY.access) || read(s, KEY.refresh)) || null;

export const getAccessToken = () => {
  const s = activeStore();
  return s ? read(s, KEY.access) : null;
};

export const getRefreshToken = () => {
  const s = activeStore();
  return s ? read(s, KEY.refresh) : null;
};

/* Reads the payload of a JWT. No signature check: the server does that. */
export const decodeToken = (token) => {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "=")));
  } catch {
    return null;
  }
};

/* "user" | "remaker" | "admin" | null, taken from the token itself. */
export const getAccountType = () => {
  const claim = decodeToken(getAccessToken() || getRefreshToken() || "");
  return claim?.account_type || null;
};

export const isSignedIn = (type) => {
  if (!getAccessToken() && !getRefreshToken()) return false;
  return type ? getAccountType() === type : true;
};

export const getAccount = (type = getAccountType()) => {
  const s = activeStore();
  if (!s || !ACCOUNT_KEY[type]) return null;
  try {
    return JSON.parse(read(s, ACCOUNT_KEY[type]) || "null");
  } catch {
    return null;
  }
};

/* Save a new session after login or registration.
   type: "user" | "remaker" | "admin", account: the object the API returned. */
export function saveSession({ access, refresh, type, account, remember = true }) {
  const [primary, other] = remember
    ? [window.localStorage, window.sessionStorage]
    : [window.sessionStorage, window.localStorage];

  // Never leave an old session behind in the other storage.
  [KEY.access, KEY.refresh, KEY.type, KEY.id, ...Object.values(ACCOUNT_KEY)].forEach(
    (k) => remove(other, k),
  );

  write(primary, KEY.access, access);
  write(primary, KEY.refresh, refresh);
  write(primary, KEY.type, type);
  if (account?.public_id) write(primary, KEY.id, account.public_id);
  if (account) write(primary, ACCOUNT_KEY[type], JSON.stringify(account));
}

/* After a token refresh: keep the session where it already lives. */
export function updateTokens({ access, refresh }) {
  const s = activeStore() || window.localStorage;
  if (access) write(s, KEY.access, access);
  if (refresh) write(s, KEY.refresh, refresh);
}

/* Update the cached account (for example after a profile edit). */
export const ACCOUNT_UPDATED_EVENT = "reorbit:account-updated";

export function updateAccount(type, account) {
  const s = activeStore();
  if (s && ACCOUNT_KEY[type]) write(s, ACCOUNT_KEY[type], JSON.stringify(account));
  window.dispatchEvent(new Event(ACCOUNT_UPDATED_EVENT));
}

export function clearSession() {
  stores().forEach((s) => {
    [KEY.access, KEY.refresh, KEY.type, KEY.id, ...Object.values(ACCOUNT_KEY)].forEach(
      (k) => remove(s, k),
    );
  });
}

/* The session is over (refresh failed or the account was removed). */
export function endSession() {
  clearSession();
  window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
}
