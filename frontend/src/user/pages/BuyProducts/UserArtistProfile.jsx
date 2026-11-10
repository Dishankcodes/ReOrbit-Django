import React from "react";
import { Link, useParams, useSearchParams } from "../../../shared/portalRouter";
import { UserX } from "lucide-react";

import { getRemakerById, getRemakerProducts, getSellerReviews } from "../../../data/marketplaceData";
import { useUserComplaintFiler } from "../../../shared/complaints";
import { useFollowing } from "../../data/followStore";
import { personChat } from "../../components/ui/MessageButton";
import ProfileShell from "./ProfileShell";

export default function UserArtistProfile() {
  const { artistId } = useParams();
  const [params] = useSearchParams();
  const artist = getRemakerById(artistId);
  const { isFollowing, toggle } = useFollowing();
  const fileComplaint = useUserComplaintFiler();

  if (!artist) {
    return (
      <div className="dn mk-empty" style={{ margin: "40px auto", maxWidth: 520 }}>
        <UserX size={32} />
        <h3>ReMaker not found</h3>
        <p>This studio is no longer available.</p>
        <Link to="/user-remakers" className="dn-btn">See all ReMakers</Link>
      </div>
    );
  }

  return (
    <ProfileShell
      person={artist}
      isMaker
      products={getRemakerProducts(artistId)}
      reviews={getSellerReviews(artistId)}
      portfolio={artist.portfolio || []}
      following={isFollowing(artistId)}
      onFollow={() => toggle(artistId)}
      chat={personChat(artist, "remaker")}
      reportType="ReMaker"
      reportTarget={{ name: artist.name, sub: `${artist.craft} · ${artist.city}`, image: artist.image, ownerName: artist.name, ownerRole: "ReMaker" }}
      fileComplaint={fileComplaint}
      initialTab={params.get("tab")}
    />
  );
}
