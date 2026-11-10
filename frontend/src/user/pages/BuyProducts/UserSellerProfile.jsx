import React from "react";
import { useParams, useSearchParams } from "../../../shared/portalRouter";
import { UserX } from "lucide-react";

import { getProductsBySeller, getSellerReviews, getUserById } from "../../../data/marketplaceData";
import { useUserComplaintFiler } from "../../../shared/complaints";
import { useFollowing } from "../../data/followStore";
import { personChat } from "../../components/ui/MessageButton";
import ProfileShell from "./ProfileShell";
import { Link } from "../../../shared/portalRouter";

export default function UserSellerProfile() {
  const { sellerId } = useParams();
  const [params] = useSearchParams();
  const seller = getUserById(sellerId);
  const { isFollowing, toggle } = useFollowing();
  const fileComplaint = useUserComplaintFiler();

  if (!seller) {
    return (
      <div className="dn mk-empty" style={{ margin: "40px auto", maxWidth: 520 }}>
        <UserX size={32} />
        <h3>Seller not found</h3>
        <p>This profile is no longer available.</p>
        <Link to="/user-marketplace" className="dn-btn">Back to marketplace</Link>
      </div>
    );
  }

  return (
    <ProfileShell
      person={seller}
      isMaker={false}
      products={getProductsBySeller(sellerId)}
      reviews={getSellerReviews(sellerId)}
      following={isFollowing(sellerId)}
      onFollow={() => toggle(sellerId)}
      chat={personChat(seller, "seller")}
      reportType="User"
      reportTarget={{ name: seller.name, sub: `Community seller · ${seller.city}`, image: seller.image, ownerName: seller.name, ownerRole: "User" }}
      fileComplaint={fileComplaint}
      initialTab={params.get("tab")}
    />
  );
}
