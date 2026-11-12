import {
  clearSession,
  endSession,
  getAccessToken,
  getRefreshToken,
  updateTokens,
} from "./session";

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
  const { method = "GET", body, headers = {}, auth = true } = options;
  let token = options.token || (auth ? getAccessToken() : null);

  try {
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
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === "TypeError") {
      throw new Error(
        "Unable to connect to the ReOrbit server. Please check your connection and try again.",
      );
    }
    throw error;
  }
}

export { API_BASE_URL, clearSession };
