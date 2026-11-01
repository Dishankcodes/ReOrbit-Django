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

/* For stores outside the admin that need to react when the team changes a user
   (for example the User app showing a listing as verified). Returns an unsubscribe. */
export function onUsersChange(listener) {
  return subscribe(listener);
}

/* A member offered a donation in the User app: it joins their donations and
   waits in the admin's Donations queue. */
export function addUserDonation(userId, donation) {
  users = users.map((user) =>
    user.user_id !== userId ||
    user.donations.some((d) => d.donation_id === donation.donation_id)
      ? user
      : { ...user, donations: [donation, ...user.donations] },
  );
  emit();
}

/* A member submitted an item for sale in the User app: it joins their items,
   shown in the admin's Products list. */
export function addUserItem(userId, item) {
  users = users.map((user) =>
    user.user_id !== userId ||
    user.items.some((i) => i.item_id === item.item_id)
      ? user
      : { ...user, items: [item, ...user.items] },
  );
  emit();
}

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
