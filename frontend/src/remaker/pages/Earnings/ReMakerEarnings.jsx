import React, { useMemo } from "react";
import { Link } from "react-router-dom";

import EarningsNav from "./EarningsNav";
import { EarningBadge } from "../Sales/SalesParts";
import { formatPrice } from "../../data/remakerMarketplaceData";
import { formatDate } from "../../data/ordersStore";
import {
  CLEARING_DAYS,
  FEE_RATE,
  MIN_PAYOUT,
  getCustomer,
  monthlyEarnings,
  netOf,
  topProducts,
  usePayouts,
  useEarnings,
  useSales,
} from "../../data/salesStore";

import "../../css/ReMakerOrders.css";
import "../../css/ReMakerSales.css";

export default function ReMakerEarnings() {
  const orders = useSales();
  const payouts = usePayouts();
  const earnings = useEarnings();

  const months = useMemo(() => monthlyEarnings(orders, 6), [orders]);
  const best = useMemo(() => topProducts(orders, 4), [orders]);
  const recent = useMemo(
    () => orders.filter((order) => order.status === "Completed").slice(0, 5),
    [orders],
  );

  const max = Math.max(...months.map((month) => month.value), 1);
  const sixMonthTotal = months.reduce((total, month) => total + month.value, 0);
  const thisMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];
  const change =
    lastMonth && lastMonth.value > 0
      ? Math.round(
          ((thisMonth.value - lastMonth.value) / lastMonth.value) * 100,
        )
      : null;
  const canWithdraw = earnings.available >= MIN_PAYOUT;
  const lastPayout = payouts[0];

  return (
    <section className="rod rsl">
      <EarningsNav />

      {/* BALANCE */}
      <div className="sls-balance">
        <div className="sls-balance-main">
          <small>Available to withdraw</small>
          <strong>{formatPrice(earnings.available)}</strong>
          <p>
            {canWithdraw
              ? "Ready to send to your bank account."
              : earnings.available > 0
                ? `You can withdraw once you have ${formatPrice(MIN_PAYOUT)} available.`
                : "Nothing to withdraw yet. Money clears a few days after delivery."}
          </p>

          <div className="sls-balance-actions">
            <Link
              to="/remaker-earnings/payouts"
              className={`rod-btn ${canWithdraw ? "light" : "light-off"}`}
            >
              {canWithdraw ? "Withdraw money" : "View payouts"}
            </Link>
            <Link
              to="/remaker-earnings/transactions"
              className="rod-btn outline-light"
            >
              See transactions
            </Link>
          </div>
        </div>

        <dl className="sls-balance-side">
          <div>
            <dt>Clearing</dt>
            <dd>{formatPrice(earnings.clearing)}</dd>
            <small>Clears {CLEARING_DAYS} days after delivery</small>
          </div>
          <div>
            <dt>In progress</dt>
            <dd>{formatPrice(earnings.inProgress)}</dd>
            <small>From open orders</small>
          </div>
          <div>
            <dt>Paid out so far</dt>
            <dd>{formatPrice(earnings.paidOut + earnings.inPayout)}</dd>
            <small>
              {lastPayout
                ? `Last payout ${formatDate(lastPayout.createdAt)}`
                : "No payouts yet"}
            </small>
          </div>
        </dl>
      </div>

      <div className="rod-grid">
        <div className="rod-main">
          {/* CHART */}
          <section className="rod-panel">
            <div className="rod-panel-head">
              <div>
                <h3>Earnings by month</h3>
                <p className="sls-sub">
                  {formatPrice(sixMonthTotal)} in the last 6 months
                  {change !== null && (
                    <span
                      className={`sls-delta ${change >= 0 ? "up" : "down"}`}
                    >
                      {change >= 0 ? "+" : ""}
                      {change}% vs last month
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div
              className="sls-chart"
              role="img"
              aria-label={`Net earnings by month: ${months.map((m) => `${m.label} ${formatPrice(m.value)}`).join(", ")}`}
            >
              {months.map((month, index) => (
                <div
                  className={`sls-bar ${index === months.length - 1 ? "current" : ""}`}
                  key={month.key}
                >
                  <span className="sls-bar-value">
                    {month.value ? formatPrice(month.value) : ""}
                  </span>
                  <span className="sls-bar-track">
                    <i
                      style={{
                        height: `${Math.max((month.value / max) * 100, month.value ? 4 : 0)}%`,
                      }}
                    />
                  </span>
                  <span className="sls-bar-label">{month.label}</span>
                  <small>
                    {month.orders} {month.orders === 1 ? "order" : "orders"}
                  </small>
                </div>
              ))}
            </div>
          </section>

          {/* RECENT */}
          <section className="rod-panel">
            <div className="rod-panel-head">
              <h3>Recent earnings</h3>
              <Link to="/remaker-earnings/transactions">See all</Link>
            </div>

            <div className="sls-recent">
              {recent.map((order) => {
                const customer = getCustomer(order.customerId);

                return (
                  <Link
                    to={`/remaker-sales/${order.id}`}
                    className="sls-recent-row"
                    key={order.id}
                  >
                    <img src={order.image} alt="" />
                    <div>
                      <strong>{order.title}</strong>
                      <small>
                        {customer?.name} ·{" "}
                        {formatDate(
                          order.times.delivered || order.times.collected,
                        )}
                      </small>
                    </div>
                    <div className="sls-recent-end">
                      <b>{formatPrice(netOf(order))}</b>
                      <EarningBadge order={order} payouts={payouts} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="rod-side">
          <section className="rod-panel">
            <h3>Best sellers</h3>

            <div className="sls-top">
              {best.map((item, index) => (
                <Link
                  to={`/remaker-products/${item.productId}/edit`}
                  className="sls-top-row"
                  key={item.productId}
                >
                  <span className="sls-rank">{index + 1}</span>
                  <img src={item.image} alt="" />
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.units} {item.units === 1 ? "unit" : "units"} sold
                    </small>
                  </div>
                  <b>{formatPrice(item.revenue)}</b>
                </Link>
              ))}
            </div>
          </section>

          <section className="rod-help">
            <strong>How you get paid</strong>
            <p>
              ReOrbit keeps {Math.round(FEE_RATE * 100)}% of the item price.
              Delivery is paid by the customer. Money becomes withdrawable{" "}
              {CLEARING_DAYS} days after delivery, and payouts reach your bank
              in 1 to 2 working days.
            </p>
            <Link
              to="/remaker-earnings/payouts"
              className="rod-btn ghost small"
            >
              Manage payouts
            </Link>
          </section>
        </aside>
      </div>
    </section>
  );
}
