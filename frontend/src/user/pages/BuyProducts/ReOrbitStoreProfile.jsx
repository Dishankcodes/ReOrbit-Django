import React, { useEffect, useState } from "react";
import { useSearchParams } from "../../../shared/portalRouter";

import { cardToItem } from "../../../data/marketplaceData";
import { apiRequest } from "../../../api/api";
import { portalOf } from "../../../api/session";
import { usePageTitle } from "../../../shared/pageMeta";
import { usePlatformReviews } from "../../../shared/hooks/usePublicReviews";
import RateReOrbit from "../../../shared/components/RateReOrbit";
import ProfileShell from "./ProfileShell";

/* ReOrbit's own store: everything ReOrbit sells itself, opened from "Sold by ReOrbit" on a product.
   Its reviews are ratings of the platform (the same ones that become Home page testimonials):
   one per member or ReMaker, given or edited right here. There are no seller reviews for ReOrbit. */
export default function ReOrbitStoreProfile() {
  usePageTitle("ReOrbit store");
  const [params] = useSearchParams();
  const [products, setProducts] = useState([]);
  const portal = portalOf(window.location.pathname);
  const { reviews, summary } = usePlatformReviews();

  useEffect(() => {
    let active = true;
    apiRequest("/marketplace/?sold_by=admin&page_size=100", { auth: false })
      .then((r) => active && setProducts((r.data?.results || []).map(cardToItem)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <ProfileShell
      store
      person={{
        id: "reorbit",
        name: "ReOrbit",
        city: "India",
        image: "/images/brand/reorbit-globe-192.png",
        bio:
          "These items are listed and sold by ReOrbit itself, the platform, not by a member or a ReMaker. " +
          "ReOrbit checks, packs and ships them, and handles returns and support directly.",
        rating: summary.count ? summary.average.toFixed(1) : "-",
        totalReviews: summary.count,
      }}
      isMaker={false}
      products={products}
      reviews={reviews}
      reviewsTop={
        /* members and ReMakers rate ReOrbit once (and can edit it); admins only read */
        portal === "admin" ? null : (
          <div className="ushp-rate">
            <RateReOrbit side={portal === "remaker" ? "remaker" : "user"} />
          </div>
        )
      }
      initialTab={params.get("tab")}
    />
  );
}
