import { getAccount } from "../../api/session";

/* "Admin · Maya Shah": who is acting, taken from the signed-in admin
   (never a hard-coded person). Used on audit lines and timelines. */
export const adminName = () => getAccount("admin")?.full_name || "Admin";
export const adminActor = () => `Admin · ${adminName()}`;
