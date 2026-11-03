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

/* One refresh at a time: if five requests get a 401 together they share it. */
let refreshing = null;

async function refreshSession() {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  if (!refreshing) {
    refreshing = fetch(`${API_BASE_URL}${REFRESH_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const json = await res.json();
        const tokens = json?.data;
        if (!tokens?.access) return null;
        updateTokens(tokens);
        return tokens.access;
      })
      .catch(() => null)
      .finally(() => {
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
  - On a 401 it refreshes the token once and repeats the request. If that fails
    the session is cleared and "reorbit:session-ended" is fired, so RequireAuth
    sends the person to the login page.
  - Errors carry .status, .data, .errors (field -> messages) and .code.
*/
export async function apiRequest(endpoint, options = {}) {
  const { method = "GET", body, headers = {}, auth = true } = options;
  let token = options.token || (auth ? getAccessToken() : null);

  try {
    let response = await send(endpoint, { method, body, token, headers });

    if (response.status === 401 && token && endpoint !== REFRESH_PATH) {
      const fresh = await refreshSession();
      if (fresh) {
        token = fresh;
        response = await send(endpoint, { method, body, token, headers });
      } else {
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
