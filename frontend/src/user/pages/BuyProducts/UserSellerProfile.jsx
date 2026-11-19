import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "../../../shared/portalRouter";
import { UserX } from "lucide-react";

import { cardToItem } from "../../../data/marketplaceData";
import { usePageTitle } from "../../../shared/pageMeta";
import { REORBIT_PROFILE, idFrom, sellerPath } from "../../../shared/slug";
import useReadableAddress from "../../../shared/useReadableAddress";
import { apiRequest } from "../../../api/api";
import { useUserComplaintFiler } from "../../../shared/complaints";
import { useSellerReviews } from "../../../shared/hooks/usePublicReviews";
import { personChat } from "../../data/messageTargets";
import { PageLoader } from "../../../shared/components/Spinner";
import ProfileShell from "./ProfileShell";
import { Link, Navigate } from "../../../shared/portalRouter";

/* A member's public seller profile: their details from the server (GET /api/users/public/<id>/)
   and their live listings. Works in every portal, also when opened directly from a link. */
export default function UserSellerProfile() {
  const { sellerId: rawSeller } = useParams();
  const sellerId = idFrom(rawSeller); // "asha-shah-USR-1004" -> "USR-1004"
  /* an old link to ReOrbit's own "seller" page (…/seller/reorbit-ADM-1001) */
  const isPlatform = /^ADM-/i.test(sellerId);
  const [params] = useSearchParams();
  const [products, setProducts] = useState([]);
  /* this member's live listings, straight from the marketplace (any number of them) */
  useEffect(() => {
    let active = true;
    setProducts([]);
    apiRequest(`/marketplace/?seller=${encodeURIComponent(sellerId)}&page_size=100`, { auth: false })
      .then((r) => active && setProducts((r.data?.results || []).map(cardToItem)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [sellerId]);
  const [seller, setSeller] = useState(null);
  usePageTitle(seller?.name);
  useReadableAddress(rawSeller, seller ? sellerPath(sellerId, seller.name) : "");
  const [state, setState] = useState("loading"); // loading | ok | missing
  const fileComplaint = useUserComplaintFiler();
  /* reviews of the seller themself (how the sale went), not of single products */
  const { reviews, summary } = useSellerReviews("user", sellerId, "seller");

  useEffect(() => {
    let alive = true;
    setState("loading");
    apiRequest(`/users/public/${encodeURIComponent(sellerId)}/`, { auth: false })
      .then((r) => {
        if (!alive) return;
        const m = r.data.member;
        setSeller({
          id: m.id,
          name: m.name,
          username: "",
          city: m.city || "India",
          image: m.image || "",
          bio: m.bio || "Pre-loved finds, passed on through ReOrbit.",
          joined: String(m.joined),
          productsSold: Number(m.items_sold || 0).toLocaleString("en-IN"),
          badges: m.badges || [],
          sellerType: "user",
        });
        setState("ok");
      })
      .catch(() => alive && setState("missing"));
    return () => {
      alive = false;
    };
  }, [sellerId]);

  if (isPlatform) return <Navigate to={REORBIT_PROFILE} replace />;
  if (state === "loading") return <PageLoader label="Loading seller…" />;

  if (state === "missing" || !seller) {
    return (
      <div className="dn mk-empty" style={{ margin: "40px auto", maxWidth: 520 }}>
        <UserX size={32} />
        <h3>Seller not found</h3>
        <p>This profile is no longer available.</p>
        <Link to="/user-marketplace" className="dn-btn">
          Back to marketplace
        </Link>
      </div>
    );
  }

  return (
    <ProfileShell
      person={{
        ...seller,
        rating: summary.count ? summary.average.toFixed(1) : "-",
        totalReviews: summary.count,
      }}
      isMaker={false}
      products={products}
      reviews={reviews}
      chat={personChat(seller, "seller")}
      reportType="User"
      reportTarget={{
        id: sellerId,
        name: seller.name,
        sub: `Community seller · ${seller.city}`,
        image: seller.image,
        ownerName: seller.name,
        ownerRole: "User",
      }}
      fileComplaint={fileComplaint}
      initialTab={params.get("tab")}
    />
  );
}
