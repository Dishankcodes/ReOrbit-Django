import React from "react";
import { useSearchParams } from "react-router-dom";
import { PenLine, Inbox } from "lucide-react";

import MyReviews from "../../../shared/components/MyReviews";
import ReMakerReviews from "../../../remaker/pages/Reviews/ReMakerReviews";
import "../../css/shared/ui-base.css";
import "./UserReviews.css";

const TABS = [
  { key: "written", label: "Reviews I wrote", icon: PenLine },
  { key: "received", label: "Reviews I received", icon: Inbox },
];

/* My reviews: the ones I wrote (things I bought, the sellers who sent them) and, like the ReMaker
   reviews page, the ones buyers left about what I sold (reply or report there). */
export default function UserReviews() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "received" ? "received" : "written";
  return (
    <div className="dn urv">
      <div className="urv-tabs" role="tablist" aria-label="Which reviews">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={tab === t.key ? "on" : ""}
            onClick={() => setParams(t.key === "written" ? {} : { tab: t.key }, { replace: true })}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>
      {tab === "written" ? (
        <MyReviews accent="#2a4d3a" orderPath={(id) => `/user-orders/${id}`} />
      ) : (
        <ReMakerReviews member />
      )}
    </div>
  );
}
