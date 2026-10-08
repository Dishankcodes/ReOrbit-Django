const read = (key, fallback = []) => {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "null");
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return value;
  }
  return value;
};

export const getWishlistIds = () => read("reorbit_user_wishlist", []);
export const saveWishlistIds = (ids) => write("reorbit_user_wishlist", ids);
export const getFollowingIds = () => read("reorbit_user_following", []);
export const saveFollowingIds = (ids) => write("reorbit_user_following", ids);
