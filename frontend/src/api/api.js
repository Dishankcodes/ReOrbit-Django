const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

export async function apiRequest(endpoint, options = {}) {
  const { method = "GET", body, token, headers = {} } = options;

  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  console.log("ReOrbit API Request:", {
    url,
    method,
    body,
  });

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body:
        body instanceof FormData
          ? body
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
    });

    let data = {};

    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();

      data = text ? { message: text } : {};
    }

    console.log("ReOrbit API Response:", {
      status: response.status,
      data,
    });

    if (!response.ok) {
      const error = new Error(
        data?.message ||
          data?.detail ||
          `Request failed with status ${response.status}`,
      );

      error.status = response.status;
      error.data = data;

      throw error;
    }

    return data;
  } catch (error) {
    console.error("ReOrbit API Error:", error);

    if (error.name === "TypeError") {
      throw new Error(
        "Unable to connect to the ReOrbit server. Please make sure Django is running.",
      );
    }

    throw error;
  }
}

export { API_BASE_URL };
