/* Indian mobile numbers, the same rule as the server (apps/core/validators.validate_phone):
   10 digits starting 6-9, saved as "+91 98765 43210". */

/* the 10 digits a person typed or pasted (drops +91, 91, a leading 0, spaces and dashes) */
export function localDigits(value) {
  let d = String(value || "").replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
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
