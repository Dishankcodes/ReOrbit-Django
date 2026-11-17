/* Indian mobile numbers, the same rule as the server (apps/core/validators.validate_phone):
   10 digits starting 6-9, saved as "+91 98765 43210". */

/* the 10 digits a person typed or pasted (drops +91, 91, a leading 0, spaces and dashes).
   A saved "+91 9…" always loses its +91, even half-typed: without that, "+91 9" read back as
   "919" and the 91 showed up inside the box. */
export function localDigits(value) {
  const s = String(value || "").trim();
  let d = s.replace(/\D/g, "");
  if (/^\+\s*91/.test(s)) d = d.slice(2);
  else if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  if (d.length > 10 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}

/* what is saved: "+91 98765 43210", or "" when nothing was typed */
export function toPhone(value) {
  const d = localDigits(value);
  return d ? `+91 ${d.slice(0, 5)}${d.length > 5 ? ` ${d.slice(5)}` : ""}` : "";
}

export const isPhone = (value) => /^[6-9]\d{9}$/.test(localDigits(value));

export const PHONE_ERROR = "Enter a 10-digit mobile number.";
