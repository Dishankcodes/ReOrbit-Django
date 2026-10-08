import React, { useState } from "react";
import { MessageCircle, UserPlus, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import "../css/UserFollowing.css";

const initialCreators = [
  {
    id: 1,
    name: "GreenCraft Studio",
    role: "Sustainable Furniture",
    followers: "1.2K",
    products: 38,
    impact: "420 kg",
    bio: "Restoring forgotten furniture into timeless pieces.",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=500&q=80",
    following: true,
  },
  {
    id: 2,
    name: "Clay Orbit",
    role: "Ceramic Artist",
    followers: "856",
    products: 24,
    impact: "180 kg",
    bio: "Handmade ceramic pieces inspired by natural textures.",
    image:
      "https://images.unsplash.com/photo-1528712306091-ed0763094c98?auto=format&fit=crop&w=500&q=80",
    following: true,
  },
  {
    id: 3,
    name: "ReThread Studio",
    role: "Upcycled Fashion",
    followers: "2.4K",
    products: 51,
    impact: "620 kg",
    bio: "Giving discarded fabrics a fresh and useful future.",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=500&q=80",
    following: true,
  },
  {
    id: 4,
    name: "Luma ReMade",
    role: "Lighting & Decor",
    followers: "742",
    products: 19,
    impact: "145 kg",
    bio: "Thoughtful lighting made from reclaimed materials.",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=500&q=80",
    following: false,
  },
  {
    id: 5,
    name: "Second Story",
    role: "Home ReMaker",
    followers: "1.8K",
    products: 42,
    impact: "510 kg",
    bio: "Creating practical pieces from overlooked materials.",
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=500&q=80",
    following: false,
  },
  {
    id: 6,
    name: "EcoForm",
    role: "Modern ReMaker",
    followers: "935",
    products: 27,
    impact: "290 kg",
    bio: "Minimal design with maximum respect for resources.",
    image:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=500&q=80",
    following: false,
  },
];

export default function UserFollowing() {
  const navigate = useNavigate();

  const [creators, setCreators] = useState(initialCreators);

  const followingCount = creators.filter((creator) => creator.following).length;

  const toggleFollowing = (id) => {
    setCreators((current) =>
      current.map((creator) =>
        creator.id === id
          ? {
              ...creator,
              following: !creator.following,
            }
          : creator,
      ),
    );
  };

  return (
    <section className="user-following-page">
      <div className="following-header">
        <div>
          <span
            style={{
              color: "#668170",
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: ".15em",
              textTransform: "uppercase",
            }}
          >
            Your community
          </span>

          <h1>Following</h1>

          <p>
            Stay connected with creators who are giving materials and products a
            new purpose.
          </p>
        </div>

        <div className="following-count">
          {followingCount} creators following
        </div>
      </div>

      <div className="following-grid">
        {creators.map((creator) => (
          <article className="following-card" key={creator.id}>
            <div className="following-cover" />

            <div className="following-body">
              <img
                className="following-avatar"
                src={creator.image}
                alt={creator.name}
              />

              <h3>{creator.name}</h3>

              <p className="following-role">{creator.role}</p>

              <p className="following-bio">{creator.bio}</p>

              <div className="following-stats">
                <div className="following-stat">
                  <strong>{creator.followers}</strong>
                  <span>Followers</span>
                </div>

                <div className="following-stat">
                  <strong>{creator.products}</strong>
                  <span>Products</span>
                </div>

                <div className="following-stat">
                  <strong>{creator.impact}</strong>
                  <span>Impact</span>
                </div>
              </div>

              <div className="following-btn-row">
                <button
                  type="button"
                  className="following-btn"
                  onClick={() => toggleFollowing(creator.id)}
                >
                  {creator.following ? (
                    <>
                      <UserCheck
                        size={13}
                        style={{
                          marginRight: 5,
                          verticalAlign: "middle",
                        }}
                      />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus
                        size={13}
                        style={{
                          marginRight: 5,
                          verticalAlign: "middle",
                        }}
                      />
                      Follow
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="following-message-btn"
                  aria-label={`Message ${creator.name}`}
                  onClick={() =>
                    window.alert(
                      "Messaging UI will be connected in the communication phase.",
                    )
                  }
                >
                  <MessageCircle size={14} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
