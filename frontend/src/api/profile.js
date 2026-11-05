import { API_BASE_URL, apiRequest } from "./api";

/* Pictures come back as full addresses from /me/ and /profile/, but login and
   register responses give "/uploads/..". This makes both work. */
export function mediaUrl(value) {
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return API_BASE_URL.replace(/\/api\/?$/, "") + value;
}

const base = (type) => (type === "remaker" ? "/remakers/profile/" : "/users/profile/");

/* -> { account, profile } */
export const fetchProfile = (type) => apiRequest(base(type)).then((r) => r.data);

/* payload: any of full_name, username (ReMaker), bio, phone, city ... */
export const saveProfile = (type, payload) =>
  apiRequest(base(type), { method: "PATCH", body: payload }).then((r) => r.data);

/* kind: "photo" (both) or "cover" (ReMaker only) */
export function uploadImage(type, kind, file) {
  const body = new FormData();
  body.append("image", file);
  return apiRequest(`${base(type)}${kind}/`, { method: "POST", body }).then((r) => r.data.profile);
}

export const removeImage = (type, kind) =>
  apiRequest(`${base(type)}${kind}/`, { method: "DELETE" }).then((r) => r.data.profile);

export const changeUserPassword = (payload) =>
  apiRequest("/users/password/change/", { method: "POST", body: payload });

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/* Quick check before uploading; the server checks again. Returns a message or "". */
export function imageProblem(file) {
  if (!file) return "Choose an image.";
  if (!IMAGE_TYPES.includes(file.type)) return "Only JPEG, PNG or WebP images are allowed.";
  if (file.size > IMAGE_MAX_BYTES) return "Image must be 5 MB or smaller.";
  return "";
}
