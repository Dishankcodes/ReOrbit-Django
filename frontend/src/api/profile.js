import { API_BASE_URL, apiRequest } from "./api";

/* Pictures come back as full addresses from /me/ and /profile/, but login and
   register responses give "/uploads/..". This makes both work. */
export function mediaUrl(value) {
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return API_BASE_URL.replace(/\/api\/?$/, "") + value;
}

const base = (type) =>
  type === "remaker" ? "/remakers/profile/" : "/users/profile/";

/* -> { account, profile } */
export const fetchProfile = (type) =>
  apiRequest(base(type)).then((r) => r.data);

/* payload: any of full_name, username (ReMaker), bio, phone, city ... */
export const saveProfile = (type, payload) =>
  apiRequest(base(type), { method: "PATCH", body: payload }).then(
    (r) => r.data,
  );

/* kind: "photo" (both) or "cover" (ReMaker only) */
export function uploadImage(type, kind, file) {
  const body = new FormData();
  body.append("image", file);
  return apiRequest(`${base(type)}${kind}/`, { method: "POST", body }).then(
    (r) => r.data.profile,
  );
}

export const removeImage = (type, kind) =>
  apiRequest(`${base(type)}${kind}/`, { method: "DELETE" }).then(
    (r) => r.data.profile,
  );

export const changeUserPassword = (payload) =>
  apiRequest("/users/password/change/", { method: "POST", body: payload });

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/* Quick check before uploading; the server checks again. Returns a message or "". */
export function imageProblem(file) {
  if (!file) return "Choose an image.";
  if (!IMAGE_TYPES.includes(file.type))
    return "Only JPEG, PNG or WebP images are allowed.";
  if (file.size > IMAGE_MAX_BYTES) return "Image must be 5 MB or smaller.";
  return "";
}

/* ReOrbit works inside Gujarat only: pincodes 360001-396590
   (396210-396240 is Daman / Dadra & Nagar Haveli). */
export const GUJARAT = "Gujarat";
export const GUJARAT_PIN_HINT = "Gujarat pincodes only (360001 to 396590).";

export function isGujaratPincode(value) {
  const text = String(value || "").trim();
  if (!/^\d{6}$/.test(text)) return false;
  const n = Number(text);
  return n >= 360001 && n <= 396590 && !(n >= 396210 && n <= 396240);
}

export function pincodeProblem(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (!/^\d{6}$/.test(text)) return "Pincode must be 6 digits.";
  return isGujaratPincode(text)
    ? ""
    : "ReOrbit is available inside Gujarat only. Enter a Gujarat pincode.";
}

/* ---------- admin (name only; no photo, the Admins table has none) ---------- */
export const fetchAdminProfile = () =>
  apiRequest("/admins/profile/").then((r) => r.data.admin);

export const saveAdminProfile = (payload) =>
  apiRequest("/admins/profile/", { method: "PATCH", body: payload }).then(
    (r) => r.data.admin,
  );

export const changeAdminPassword = (payload) =>
  apiRequest("/admins/password/change/", { method: "POST", body: payload });
