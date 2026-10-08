import React from "react";
import {
  Leaf,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  ShoppingBag,
  HeartHandshake,
  Recycle,
} from "lucide-react";

import "../../css/UserProfile-css/UserOrbitPoints.css";

const transactions = [
  {
    id: 1,
    title: "Order completed",
    description: "Reclaimed Wooden Chair",
    points: "+120",
    type: "earned",
    icon: ShoppingBag,
  },
  {
    id: 2,
    title: "Item donated",
    description: "Old book collection",
    points: "+180",
    type: "earned",
    icon: HeartHandshake,
  },
  {
    id: 3,
    title: "Reward redeemed",
    description: "₹100 marketplace voucher",
    points: "-500",
    type: "spent",
    icon: Gift,
  },
  {
    id: 4,
    title: "Sustainable purchase",
    description: "Recycled Table Lamp",
    points: "+90",
    type: "earned",
    icon: Recycle,
  },
];

const rewards = [
  {
    title: "₹100 Marketplace Voucher",
    description: "Save on your next sustainable purchase.",
    points: 500,
  },
  {
    title: "Free Delivery",
    description: "Use on one eligible marketplace order.",
    points: 750,
  },
  {
    title: "₹250 Sustainability Voucher",
    description: "Higher-value reward for your next order.",
    points: 1200,
  },
];

export default function UserOrbitPoints() {
  const points = 1250;
  const nextLevel = 2000;
  const progress = (points / nextLevel) * 100;

  return (
    <section className="user-orbit-points-page">
      <div className="orbit-points-hero">
        <div className="orbit-points-total">
          <div className="orbit-points-icon">
            <Leaf size={30} />
          </div>

          <div>
            <small>Total Orbit Points</small>

            <strong>{points.toLocaleString("en-IN")}</strong>

            <span>Keep making sustainable choices.</span>
          </div>
        </div>

        <div className="orbit-level">
          <div className="orbit-level-top">
            <span>Next milestone</span>

            <strong>{nextLevel.toLocaleString("en-IN")} pts</strong>
          </div>

          <div className="orbit-progress">
            <span style={{ width: `${progress}%` }} />
          </div>

          <small>
            {(nextLevel - points).toLocaleString("en-IN")} points remaining to
            unlock your next level.
          </small>
        </div>
      </div>

      <div className="orbit-points-grid">
        <article className="orbit-points-card">
          <div className="orbit-points-card-header">
            <h2>Recent activity</h2>

            <p>Your latest Orbit Point movements.</p>
          </div>

          {transactions.map((transaction) => {
            const Icon = transaction.icon;

            return (
              <div className="orbit-points-row" key={transaction.id}>
                <div className="orbit-points-row-icon">
                  <Icon size={16} />
                </div>

                <div>
                  <strong>{transaction.title}</strong>

                  <small>{transaction.description}</small>
                </div>

                <span
                  className={
                    transaction.type === "earned"
                      ? "orbit-points-earned"
                      : "orbit-points-spent"
                  }
                >
                  {transaction.points}
                </span>
              </div>
            );
          })}
        </article>

        <article className="orbit-points-card">
          <div className="orbit-points-card-header">
            <h2>Redeem rewards</h2>

            <p>Turn your impact into useful benefits.</p>
          </div>

          {rewards.map((reward) => (
            <div className="orbit-reward" key={reward.title}>
              <div className="orbit-reward-icon">
                <Gift size={17} />
              </div>

              <div>
                <h3>{reward.title}</h3>

                <p>{reward.description}</p>
              </div>

              <button type="button" disabled={points < reward.points}>
                {reward.points} pts
              </button>
            </div>
          ))}
        </article>
      </div>
    </section>
  );
}
