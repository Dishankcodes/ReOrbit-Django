import React from "react";
import { useSearchParams } from "react-router-dom";

import useToast from "../../components/ui/useToast";
import RemakerProductsLive from "./RemakerProductsLive";
import StoreProducts from "./StoreProducts";
import MemberListingsLive from "./MemberListingsLive";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/remakers/AdminRemakers.css";
import "../../css/products/AdminProducts.css";

/* Every tab is real data: ReMaker products, ReOrbit's own store and member listings. */
const TABS = [
  { key: "remakers", label: "ReMaker products" },
  { key: "store", label: "ReOrbit Store" },
  { key: "members", label: "Member listings" },
];

/* Real data: ReMaker moderation, ReOrbit's own store and member listings. */
export default function AdminProducts() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get("tab"))
    ? params.get("tab")
    : "remakers";
  const { toast, toastNode } = useToast();
  return (
    <div className="au-page">
      <div className="apr-tabs" role="tablist" aria-label="Products">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() =>
              setParams(t.key === "remakers" ? {} : { tab: t.key })
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "remakers" && <RemakerProductsLive toast={toast} />}
      {tab === "store" && <StoreProducts toast={toast} />}
      {tab === "members" && <MemberListingsLive toast={toast} />}
      {toastNode}
    </div>
  );
}
