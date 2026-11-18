/* =========================================================
   User › Settings: browser leftovers.
   Notifications, privacy and security are saved on the server (/api/users/profile/),
   so the only thing kept here is clearing this browser's copies when an account is deleted.
   ========================================================= */

export function deleteAccountData() {
  try {
    [
      "reorbit_user",
      "reorbit_user_prefs",
      "reorbit_user_cart",
      "reorbit_user_wishlist",
      "reorbit_user_following",
      "reorbit_user_redeemed",
    ].forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
