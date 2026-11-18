import React, { useEffect, useState } from "react";
import { usePageTitle } from "../../../shared/pageMeta";
import { Link, useParams, useSearchParams } from "../../../shared/portalRouter";
import { UserX } from "lucide-react";

import { fetchPublicRemaker } from "../../../api/remakers";
import { apiRequest } from "../../../api/api";
import { cardToItem } from "../../../data/marketplaceData";
import { useUserComplaintFiler } from "../../../shared/complaints";
import { useSellerReviews } from "../../../shared/hooks/usePublicReviews";
import { useFollowing } from "../../data/followStore";
import { personChat } from "../../data/messageTargets";
import ProfileShell from "./ProfileShell";
import { trackProfileView } from "../../../shared/trafficSource";

export default function UserArtistProfile() {
  const { artistId } = useParams();
  const [params] = useSearchParams();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  usePageTitle(artist?.name);
  const { isFollowing, toggle } = useFollowing();
  const fileComplaint = useUserComplaintFiler();
  const { reviews } = useSellerReviews("remaker", artistId);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetchPublicRemaker(artistId)
      .then((record) => {
        if (active) setArtist(record);
      })
      .catch((e) => {
        if (active)
          setError(e.message || "This studio is no longer available.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [artistId]);

  useEffect(() => {
    if (artist) trackProfileView(artistId);
  }, [artist, artistId]);

  /* this studio's live products, straight from the marketplace (any number of them) */
  useEffect(() => {
    let active = true;
    setProducts([]);
    apiRequest(`/marketplace/?seller=${encodeURIComponent(artistId)}&page_size=100`, { auth: false })
      .then((r) => {
        if (active) setProducts((r.data?.results || []).map(cardToItem));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [artistId]);

  if (loading) {
    return (
      <div className="dn mk-empty" role="status">
        Loading ReMaker profile…
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div
        className="dn mk-empty"
        style={{ margin: "40px auto", maxWidth: 520 }}
      >
        <UserX size={32} />
        <h3>ReMaker not found</h3>
        <p>{error || "This studio is no longer available."}</p>
        <Link to="/user-remakers" className="dn-btn">
          See all ReMakers
        </Link>
      </div>
    );
  }

  return (
    <ProfileShell
      person={artist}
      isMaker
      products={products}
      reviews={reviews}
      portfolio={artist.portfolio || []}
      following={isFollowing(artist.id)}
      onFollow={() => toggle(artist.id)}
      chat={personChat(artist, "remaker")}
      reportType="ReMaker"
      reportTarget={{
        id: artistId,
        name: artist.name,
        sub: `${artist.craft} · ${artist.city}`,
        image: artist.image,
        ownerName: artist.name,
        ownerRole: "ReMaker",
      }}
      fileComplaint={fileComplaint}
      initialTab={params.get("tab")}
    />
  );
}
