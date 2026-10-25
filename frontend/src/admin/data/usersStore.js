/* =========================================================
   Tiny in-memory store for the Users pages (UI only).
   Keeps account-status changes alive while you move between
   the users list and a user profile. Resets on page refresh.

   Backend later: replace these functions with API calls.
   ========================================================= */

import { useSyncExternalStore } from "react";
import { INITIAL_USERS } from "./adminUsers";

let users = INITIAL_USERS;
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return users;
}

export const getUsers = () => users;

/* Change one donation inside a user's record (admin accept / reject / progress). */
export function updateUserDonation(userId, donationId, patch) {
  users = users.map((user) =>
    user.user_id !== userId
      ? user
      : {
          ...user,
          donations: user.donations.map((d) =>
            d.donation_id === donationId ? { ...d, ...patch } : d,
          ),
        },
  );
  emit();
}

export function useUsers() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useUser(userId) {
  const all = useUsers();
  return all.find((user) => user.user_id === userId) || null;
}

/* Change one or many users' status and log it in their history. */
export function changeUserStatus(userIds, newStatus, reason = "") {
  const ids = new Set(Array.isArray(userIds) ? userIds : [userIds]);
  const at = new Date().toISOString();

  users = users.map((user) => {
    if (!ids.has(user.user_id) || user.status === newStatus) return user;
    return {
      ...user,
      status: newStatus,
      updated_at: at,
      statusHistory: [
        {
          id: `${user.user_id}-${Date.now()}`,
          action: newStatus,
          reason: reason || "No reason provided.",
          by: "Admin · You",
          at,
        },
        ...user.statusHistory,
      ],
    };
  });
  emit();
}

/* Verify / reject an uploaded item from the profile page. */
export function reviewUserItem(userId, itemId, decision, message = "") {
  users = users.map((user) => {
    if (user.user_id !== userId) return user;
    return {
      ...user,
      items: user.items.map((item) =>
        item.item_id !== itemId
          ? item
          : decision === "Verified"
            ? {
                ...item,
                verification_status: "Verified",
                item_status: "Listed",
                rejection_message: "",
              }
            : {
                ...item,
                verification_status: "Rejected",
                item_status: "Draft",
                rejection_message: message,
              },
      ),
    };
  });
  emit();
}

/* Update admin-side fields on one uploaded item without changing other fields. */
export function updateUserItem(userId, itemId, patch) {
  users = users.map((user) =>
    user.user_id !== userId
      ? user
      : {
          ...user,
          items: user.items.map((item) =>
            item.item_id !== itemId ? item : { ...item, ...patch },
          ),
        },
  );
  emit();
}
