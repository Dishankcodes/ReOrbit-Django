import { Check, MapPin, Star, Users, UserMinus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { remakers } from "../data/mockData";
import { getFollowingIds, saveFollowingIds } from "../data/userUiState";
import "../styles/pages.css";

export default function UserFollowing() {
  const [followingIds, setFollowingIds] = useState(() => {
    const stored = getFollowingIds();
    return stored.length ? stored : remakers.map((remaker) => remaker.id);
  });
  const followed = useMemo(
    () => remakers.filter((remaker) => followingIds.includes(remaker.id)),
    [followingIds],
  );

  const toggle = (id) => {
    setFollowingIds((current) => {
      const next = current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id];
      saveFollowingIds(next);
      return next;
    });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">YOUR CREATIVE CIRCLE</span>
          <h2>Following</h2>
          <p>Stay close to ReMakers whose work you want to see next.</p>
        </div>
        <span className="count-chip"><Users size={13} /> {followed.length} creators</span>
      </div>

      {followed.length ? (
        <div className="following-grid">
          {followed.map((remaker) => (
            <article className="creator-card card" key={remaker.id}>
              <div className="creator-cover" />
              <div className="creator-body">
                <img src={remaker.image} alt={remaker.name} />
                <span className="verified"><Check size={10} /></span>
                <div className="creator-copy">
                  <span className="pill">ReMaker</span>
                  <h3>{remaker.name}</h3>
                  <p>{remaker.craft}</p>
                  <small><MapPin size={11} /> {remaker.city} · <Star size={11} fill="currentColor" /> {remaker.rating}</small>
                </div>
                <button className="following-btn" type="button" onClick={() => toggle(remaker.id)}>
                  <UserMinus size={14} /> Following
                </button>
              </div>
              <div className="creator-stats">
                <span><strong>{remaker.rescued}</strong> rescued</span>
                <span><strong>{remaker.products}</strong> products</span>
                <span><strong>{remaker.followers.toLocaleString("en-IN")}</strong> followers</span>
              </div>
              <Link to={`/user-artist-profile/${remaker.id}`}>View studio <Star size={13} /></Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="card empty">
          <Users size={25} />
          <h3>Your creative circle is empty.</h3>
          <p>Discover a ReMaker and follow their studio to see them here.</p>
          <Link className="btn btn-primary" to="/discover-remakers">Discover ReMakers</Link>
        </div>
      )}
    </div>
  );
}
