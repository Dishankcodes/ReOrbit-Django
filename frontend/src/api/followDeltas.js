/* Follower counts come from the server, so they already include everyone who
   followed before the page loaded. While a member is on a page they can follow
   or unfollow, and the number should move straight away. This remembers those
   moves (+1 / -1 per ReMaker) so the screen adds them to the server count.
   Fetching fresh counts clears them: the new number already includes them. */

const deltas = new Map();

export const followDelta = (id) => deltas.get(id) || 0;

export function bumpFollowDelta(id, amount) {
  deltas.set(id, (deltas.get(id) || 0) + amount);
}

export function resetFollowDeltas() {
  deltas.clear();
}
