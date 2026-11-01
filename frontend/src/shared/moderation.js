/* =========================================================
   Shared › Product moderation (what admin did to my products).
   Admin can deactivate a ReMaker product with a reason, bring
   it back, and suggest a price. A ReMaker product that carries
   an `adminId` is linked to the admin record, so those actions
   show up here.
   ========================================================= */

import { useMemo } from "react";
import { useMyRemakerAccount, useMyUserAccount } from "./identity";
import { useProducts } from "../admin/data/productsStore";

/* ReMaker: { [adminProductId]: { hold, suggested } } */
export function useRemakerModeration() {
  const me = useMyRemakerAccount();
  const all = useProducts();
  return useMemo(() => {
    const map = {};
    (me?.products || []).forEach((p) => {
      /* Two ways the team switches a product off: "Disable" on the product page
         (is_disabled + reason) or "Deactivate" in the list (status + a logged reason). */
      const flagged =
        p.is_disabled && p.disabled_reason
          ? { reason: p.disabled_reason, at: p.disabled_at }
          : null;
      const logged =
        p.status === "Inactive"
          ? all
              .find((x) => x.id === p.product_id)
              ?.history?.find((h) => h.label === "Deactivated")
          : null;
      map[p.product_id] = {
        hold:
          flagged ||
          (logged
            ? {
                reason: logged.reason || "Deactivated by the ReOrbit team.",
                at: logged.at,
              }
            : null),
        suggested:
          p.suggested_price != null
            ? {
                price: p.suggested_price,
                message: p.suggested_price_message || "",
                at: p.suggested_price_at,
              }
            : null,
      };
    });
    return map;
  }, [me, all]);
}

/* User: { [adminItemId]: { disabled, suggested } }  (what the team did to my listings) */
export function useUserItemReview() {
  const me = useMyUserAccount();
  return useMemo(() => {
    const map = {};
    (me?.items || []).forEach((i) => {
      map[i.item_id] = {
        disabled:
          i.is_disabled && i.disabled_reason
            ? { reason: i.disabled_reason, at: i.disabled_at }
            : null,
        suggested:
          i.suggested_price != null
            ? {
                price: i.suggested_price,
                message: i.suggested_price_message || "",
                at: i.suggested_price_at,
              }
            : null,
      };
    });
    return map;
  }, [me]);
}
