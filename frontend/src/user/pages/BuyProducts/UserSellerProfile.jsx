import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "../../../shared/portalRouter";
import { UserX } from "lucide-react";

import { getProductsBySeller } from "../../../data/marketplaceData";
import { apiRequest } from "../../../api/api";
import { useLiveMarketplace } from "../../data/liveMarketplace";
import { useUserComplaintFiler } from "../../../shared/complaints";
import { useSellerReviews } from "../../../shared/hooks/usePublicReviews";
import { useFollowing } from "../../data/followStore";
import { personChat } from "../../data/messageTargets";
import { PageLoader } from "../../../shared/components/Spinner";
import ProfileShell from "./ProfileShell";
import { Link } from "../../../shared/portalRouter";

/* A member's public seller profile: their details from the server (GET /api/users/public/<id>/)
   and their live listings. Works in every portal, also when opened directly from a link. */
export default function UserSellerProfile() {
  const { sellerId } = useParams();
  const [params] = useSearchParams();
  const live = useLiveMarketplace(); // loads live listings when this page is opened directly
  const [seller, setSeller] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | missing
  const { isFollowing, toggle } = useFollowing();
  const fileComplaint = useUserComplaintFiler();
  const { reviews, summary } = useSellerReviews("user", sellerId);

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
          productsSold: m.items_sold,
          sellerType: "user",
        });
        setState("ok");
      })
      .catch(() => alive && setState("missing"));
    return () => {
      alive = false;
    };
  }, [sellerId]);

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

  void live;
  return (
    <ProfileShell
      person={{
        ...seller,
        rating: summary.count ? summary.average.toFixed(1) : "-",
        totalReviews: summary.count,
      }}
      isMaker={false}
      products={getProductsBySeller(sellerId)}
      reviews={reviews}
      following={isFollowing(sellerId)}
      onFollow={() => toggle(sellerId)}
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
