import {
  clearSession,
  endSession,
  getAccessToken,
  getRefreshToken,
  updateTokens,
} from "./session";

import { readyFormData } from "../shared/compressPhoto";
import { applyPaused, blocksRequest } from "../shared/pause";

export const ACCOUNT_STATUS_EVENT = "reorbit:account-status";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

const REFRESH_PATH = "/auth/token/refresh/";
const REFRESH_LOCK_NAME = "reorbit-auth-token-refresh";

/* Same-tab requests share one refresh promise. Cross-tab requests are
   serialized with the Web Locks API so rotating refresh tokens cannot race. */
let refreshing = null;

async function performRefresh() {
  const refresh = getRefreshToken();
  if (!refresh) return { access: null, invalid: true };

  try {
    const response = await fetch(`${API_BASE_URL}${REFRESH_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refresh }),
    });

    // Only an explicit auth rejection means the refresh token is unusable.
    // 429, 5xx and other server errors must not destroy a valid local session.
    if (response.status === 401 || response.status === 403) {
      return { access: null, invalid: true };
    }
    if (!response.ok) {
      return { access: null, invalid: false };
    }

    const json = await response.json();
    const tokens = json?.data;
    if (!tokens?.access || !tokens?.refresh) {
      return { access: null, invalid: false };
    }

    updateTokens(tokens);
    return { access: tokens.access, invalid: false };
  } catch {
    // Network interruptions are temporary; do not clear credentials.
    return { access: null, invalid: false };
  }
}

async function refreshSession(failedAccessToken) {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshWithLock = async () => {
        // Another tab may have refreshed while this tab waited for the lock.
        const latestAccess = getAccessToken();
        if (latestAccess && latestAccess !== failedAccessToken) {
          return { access: latestAccess, invalid: false };
        }
        return performRefresh();
      };

      // Web Locks coordinates tabs/windows on the same origin. The app runs
      // on localhost or HTTPS, where this API is available in modern browsers.
      if (navigator.locks?.request) {
        return navigator.locks.request(
          REFRESH_LOCK_NAME,
          { mode: "exclusive" },
          refreshWithLock,
        );
      }

      // Fallback for browsers without Web Locks: retain same-tab coalescing.
      return refreshWithLock();
    })().finally(() => {
      refreshing = null;
    });
  }

  return refreshing;
}

async function parse(response) {
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }
  const text = await response.text();
  return text ? { message: text } : {};
}

function send(endpoint, { method, body, token, headers }) {
  const requestHeaders = { Accept: "application/json", ...headers };
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
  }
  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  return fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body:
      body instanceof FormData
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
  }).catch((error) => {
    error.isNetwork = true; // the request never got an answer (offline, server down, upload cut off)
    throw error;
  });
}

/*
  apiRequest("/users/me/")
  - Adds the signed-in token by itself. Pass `token` to use a different one,
    or `auth: false` for public calls (login, register ...).
  - On a 401 it refreshes once, coordinated across tabs, and retries the request.
  - The session is cleared only when the refresh endpoint explicitly rejects
    the refresh token (401/403), not for network errors, throttling or 5xx errors.
  - Errors carry .status, .data, .errors (field -> messages) and .code.
*/
export async function apiRequest(endpoint, options = {}) {
  const { method = "GET", headers = {}, auth = true } = options;
  let { body } = options;
  let token = options.token || (auth ? getAccessToken() : null);
  const isUpload = body instanceof FormData;

  /* this side is paused by a Super Admin: don't call the server at all (the PauseGate screen shows) */
  if (blocksRequest(endpoint)) {
    const error = new Error("ReOrbit is paused for a short while. Please come back a little later.");
    error.status = 503;
    error.code = "PAUSED";
    throw error;
  }

  try {
    /* photos are read into memory first: a file the phone can no longer read gives a clear
       "choose it again" message instead of a silent failed request */
    if (isUpload) body = await readyFormData(body);
    let response = await send(endpoint, { method, body, token, headers });

    if (response.status === 401 && token && endpoint !== REFRESH_PATH) {
      const fresh = await refreshSession(token);
      if (fresh.access) {
        token = fresh.access;
        response = await send(endpoint, { method, body, token, headers });
      } else if (fresh.invalid) {
        endSession();
      }
    }

    const data = await parse(response);

    if (!response.ok) {
      const error = new Error(
        data?.message ||
          data?.detail ||
          `Request failed with status ${response.status}`,
      );
      error.status = response.status;
      error.data = data;
      error.errors = data?.errors;
      error.code = data?.code;
      if (response.status === 503 && data?.code === "PAUSED") applyPaused(data.paused);
      /* an admin still on a temporary password left the "choose your own" step: sign in again */
      if (response.status === 403 && data?.code === "PASSWORD_CHANGE_REQUIRED" && typeof window !== "undefined") {
        clearSession();
        window.location.assign("/admin-login");
      }
      /* the account was suspended or blocked while signed in: the apps re-read their status */
      if (response.status === 403 && /^ACCOUNT_(SUSPENDED|BLOCKED)$/.test(data?.code || "")) {
        try {
          window.dispatchEvent(new CustomEvent(ACCOUNT_STATUS_EVENT, { detail: { code: data.code } }));
        } catch {
          /* no window (tests) */
        }
      }
      throw error;
    }

    return data;
  } catch (error) {
    if (error.isNetwork) {
      throw new Error(
        isUpload
          ? "The upload didn't reach the ReOrbit server. Check your connection and try again."
          : "Unable to connect to the ReOrbit server. Please check your connection and try again.",
      );
    }
    if (error.name === "TypeError" && error.status === undefined) {
      // a mistake in the page itself, not the connection: say so, and keep the details for debugging
      console.error("[ReOrbit] request failed in the page:", error);
      throw new Error("Something went wrong on this page. Please refresh and try again.");
    }
    throw error;
  }
}

export { API_BASE_URL, clearSession };
