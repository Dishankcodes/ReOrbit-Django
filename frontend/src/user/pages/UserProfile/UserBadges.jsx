import React from "react";
import {
  Award,
  Leaf,
  PackageCheck,
  HeartHandshake,
  ShoppingBag,
  Recycle,
  LockKeyhole,
  Star,
} from "lucide-react";

import "../../css/UserProfile-css/UserBadges.css";

const badges = [
  {
    id: 1,
    title: "First Orbit",
    description: "Completed your first ReOrbit purchase.",
    progress: "Completed",
    icon: ShoppingBag,
    unlocked: true,
  },
  {
    id: 2,
    title: "Reuse Champion",
    description: "Helped give 25 items a second life.",
    progress: "25 / 25",
    icon: Recycle,
    unlocked: true,
  },
  {
    id: 3,
    title: "Green Supporter",
    description: "Supported sustainable creators through purchases.",
    progress: "12 / 10",
    icon: HeartHandshake,
    unlocked: true,
  },
  {
    id: 4,
    title: "Orbit Explorer",
    description: "Explore 50 unique sustainable products.",
    progress: "38 / 50",
    icon: Star,
    unlocked: false,
  },
  {
    id: 5,
    title: "Impact Builder",
    description: "Reach 50 kg of waste diverted.",
    progress: "31 / 50 kg",
    icon: Leaf,
    unlocked: false,
  },
  {
    id: 6,
    title: "Circular Hero",
    description: "Complete 100 sustainable actions.",
    progress: "64 / 100",
    icon: PackageCheck,
    unlocked: false,
  },
];

export default function UserBadges() {
  const unlocked = badges.filter((badge) => badge.unlocked).length;

  return (
    <section className="user-badges-page">
      <div className="badges-header">
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
            Your achievements
          </span>

          <h1>Badges</h1>

          <p>
            Every sustainable action moves you one step further
            around the ReOrbit.
          </p>
        </div>

        <div className="badges-progress-card">
          <div className="badges-progress-top">
            <span>Badge collection</span>

            <strong>
              {unlocked}/{badges.length}
            </strong>
          </div>

          <div className="badges-progress">
            <span
              style={{
                width: `${(unlocked / badges.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="badges-grid">
        {badges.map((badge) => {
          const Icon = badge.icon;

          return (
            <article
              key={badge.id}
              className={`badge-card ${
                badge.unlocked ? "" : "locked"
              }`}
            >
              <div className="badge-icon">
                <Icon size={24} />
              </div>

              <div className="badge-card-content">
                <h3>{badge.title}</h3>

                <p>{badge.description}</p>

                <small>{badge.progress}</small>
              </div>

              {!badge.unlocked && (
                <div className="badge-locked">
                  <LockKeyhole size={11} />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}