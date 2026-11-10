import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "../../../shared/portalRouter";
import { UserX } from "lucide-react";

import { fetchPublicRemaker } from "../../../api/remakers";
import { useUserComplaintFiler } from "../../../shared/complaints";
import { useFollowing } from "../../data/followStore";
import { personChat } from "../../components/ui/MessageButton";
import ProfileShell from "./ProfileShell";

export default function UserArtistProfile() {
  const { artistId } = useParams();
  const [params] = useSearchParams();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isFollowing, toggle } = useFollowing();
  const fileComplaint = useUserComplaintFiler();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetchPublicRemaker(artistId)
      .then((record) => {
        if (active) setArtist(record);
      })
      .catch((e) => {
        if (active) setError(e.message || "This studio is no longer available.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [artistId]);

  if (loading) {
    return <div className="dn mk-empty" role="status">Loading ReMaker profile…</div>;
  }

  if (error || !artist) {
    return (
      <div className="dn mk-empty" style={{ margin: "40px auto", maxWidth: 520 }}>
        <UserX size={32} />
        <h3>ReMaker not found</h3>
        <p>{error || "This studio is no longer available."}</p>
        <Link to="/user-remakers" className="dn-btn">See all ReMakers</Link>
      </div>
    );
  }

  return (
    <ProfileShell
      person={artist}
      isMaker
      products={[]}
      reviews={[]}
      portfolio={artist.portfolio || []}
      following={isFollowing(artist.id)}
      onFollow={() => toggle(artist.id)}
      chat={personChat(artist, "remaker")}
      reportType="ReMaker"
      reportTarget={{ name: artist.name, sub: `${artist.craft} · ${artist.city}`, image: artist.image, ownerName: artist.name, ownerRole: "ReMaker" }}
      fileComplaint={fileComplaint}
      initialTab={params.get("tab")}
    />
  );
}
