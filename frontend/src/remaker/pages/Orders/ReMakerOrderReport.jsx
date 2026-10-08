import React, { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { OrderNotFound } from "./ReMakerOrderDetails";
import { formatPrice } from "../../data/remakerMarketplaceData";
import { fileToDataUrl } from "../../data/portfolioStore";
import {
  REPORT_TOPICS,
  addReport,
  canReport,
  formatDate,
  formatDateTime,
  reportTypeFor,
  useOrder,
} from "../../data/ordersStore";
import { StatusBadge } from "../../pages-components/OrderParts";

import "../../css/ReMakerOrders.css";

const DESC_MIN = 20;
const DESC_MAX = 600;
const MAX_PHOTOS = 3;

export default function ReMakerOrderReport() {
  const { orderId } = useParams();
  const order = useOrder(orderId);

  if (!order) return <OrderNotFound />;

  return <Report key={order.id} order={order} />;
}

function OrderSummary({ order }) {
  return (
    <section className="rod-panel rod-summary">
      <h3>About this order</h3>

      <div className="rod-summary-item">
        <img src={order.image} alt="" />
        <div>
          <small>{order.id}</small>
          <strong>{order.title}</strong>
          <span>
            {order.sellerName} · {formatPrice(order.total)}
          </span>
        </div>
      </div>

      <dl className="rod-facts compact">
        <div>
          <dt>Placed on</dt>
          <dd>{formatDate(order.createdAt)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <StatusBadge order={order} />
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Report({ order }) {
  const navigate = useNavigate();

  const existing = order.reports[order.reports.length - 1] || null;

  const [topic, setTopic] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const fileRef = useRef(null);

  const topicInfo = REPORT_TOPICS.find((item) => item.key === topic);

  /* ----- cancelled orders can't be reported ----- */
  if (!canReport(order)) {
    return (
      <section className="rod">
        <nav className="rod-crumbs" aria-label="Breadcrumb">
          <Link to="/remaker-orders">My orders</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/remaker-orders/${order.id}`}>{order.id}</Link>
          <span aria-hidden="true">/</span>
          <strong>Report</strong>
        </nav>

        <div className="rod-empty small">
          <h2>This order was cancelled</h2>
          <p>There is nothing to report on a cancelled order. If you were charged, check the refund status.</p>
          <Link to={`/remaker-orders/${order.id}`} className="rod-btn primary">
            Back to order
          </Link>
        </div>
      </section>
    );
  }

  /* ----- already reported: show its status ----- */
  if (existing) {
    const stages = ["Pending", "Reviewed", "Resolved"];
    const current = existing.status === "Rejected" ? 2 : stages.indexOf(existing.status);

    return (
      <section className="rod rod-report-page">
        <nav className="rod-crumbs" aria-label="Breadcrumb">
          <Link to="/remaker-orders">My orders</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/remaker-orders/${order.id}`}>{order.id}</Link>
          <span aria-hidden="true">/</span>
          <strong>Report</strong>
        </nav>

        <div className="rod-grid">
          <div className="rod-main">
            <section className="rod-panel">
              <div className="rod-panel-head">
                <h3>Your report</h3>
                <span className={`rod-badge report-${existing.status.toLowerCase()}`}>{existing.status}</span>
              </div>

              <ol className="rod-report-steps">
                {stages.map((stage, i) => (
                  <li
                    className={i < current || (i === current && existing.status !== "Pending") ? "done" : i === current ? "current" : ""}
                    key={stage}
                  >
                    <span aria-hidden="true" />
                    {existing.status === "Rejected" && stage === "Resolved" ? "Rejected" : stage}
                  </li>
                ))}
              </ol>

              <dl className="rod-facts">
                <div>
                  <dt>Report ID</dt>
                  <dd>{existing.id}</dd>
                </div>
                <div>
                  <dt>About</dt>
                  <dd>
                    {REPORT_TOPICS.find((item) => item.key === existing.topic)?.label || "Other"} ·{" "}
                    {existing.reason}
                  </dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{formatDateTime(existing.createdAt)}</dd>
                </div>
                <div>
                  <dt>Details</dt>
                  <dd>{existing.description}</dd>
                </div>
              </dl>

              {existing.photos.length > 0 && (
                <div className="rod-evidence">
                  {existing.photos.map((src, i) => (
                    <img src={src} alt={`Evidence ${i + 1}`} key={i} />
                  ))}
                </div>
              )}

              {existing.resolution ? (
                <p className="rod-note good">
                  <strong>Our response:</strong> {existing.resolution}
                </p>
              ) : (
                <p className="rod-note">
                  Our team is reviewing this. You will see the result here, usually within 24 hours.
                </p>
              )}
            </section>

            <Link to={`/remaker-orders/${order.id}`} className="rod-btn ghost back">
              Back to order
            </Link>
          </div>

          <aside className="rod-side">
            <OrderSummary order={order} />
          </aside>
        </div>
      </section>
    );
  }

  /* ----- new report form ----- */
  const errors = {
    topic: topic ? "" : "Choose what this is about.",
    reason: reason ? "" : "Pick the closest reason.",
    description:
      description.trim().length >= DESC_MIN
        ? ""
        : `Describe the problem in at least ${DESC_MIN} characters.`,
  };

  const show = (key) => (attempted ? errors[key] : "");

  const addPhotos = async (files) => {
    setPhotoError("");

    for (const file of Array.from(files).slice(0, MAX_PHOTOS - photos.length)) {
      try {
        const url = await fileToDataUrl(file, 900, 0.7);
        setPhotos((current) => (current.length < MAX_PHOTOS ? [...current, url] : current));
      } catch (error) {
        setPhotoError(error.message);
      }
    }
  };

  const submit = () => {
    setAttempted(true);

    if (Object.values(errors).some(Boolean)) {
      requestAnimationFrame(() =>
        document
          .querySelector('.rod-report-page [aria-invalid="true"], .rod-report-page [data-invalid="true"]')
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      return;
    }

    const report = addReport(order.id, {
      topic,
      type: reportTypeFor(topic, order),
      reason,
      description: description.trim(),
      photos,
    });

    navigate(`/remaker-orders/${order.id}`, {
      state: { notice: `Report ${report.id} submitted. We will review it within 24 hours.` },
    });
  };

  return (
    <section className="rod rod-report-page">
      <nav className="rod-crumbs" aria-label="Breadcrumb">
        <Link to="/remaker-orders">My orders</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/remaker-orders/${order.id}`}>{order.id}</Link>
        <span aria-hidden="true">/</span>
        <strong>Report an issue</strong>
      </nav>

      <div className="rod-grid">
        <div className="rod-main">
          {/* TOPIC */}
          <section className="rod-panel" data-invalid={show("topic") ? "true" : undefined}>
            <h3>What is this about?</h3>

            <div className="rod-topics" role="radiogroup" aria-label="Report topic">
              {REPORT_TOPICS.map((item) => (
                <label className={topic === item.key ? "active" : ""} key={item.key}>
                  <input
                    type="radio"
                    name="topic"
                    checked={topic === item.key}
                    onChange={() => {
                      setTopic(item.key);
                      setReason(item.reasons.length === 1 ? item.reasons[0] : "");
                    }}
                  />
                  <span className="rod-radio" aria-hidden="true" />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.note}</small>
                  </span>
                </label>
              ))}
            </div>
            {show("topic") && <p className="rod-error">{show("topic")}</p>}
          </section>

          {/* DETAILS */}
          <section className="rod-panel">
            <h3>Tell us what happened</h3>

            <div className="rod-fields">
              <div className="rod-field">
                <label htmlFor="rod-reason">Reason</label>
                <div className="rod-select">
                  <select
                    id="rod-reason"
                    value={reason}
                    disabled={!topicInfo}
                    onChange={(event) => setReason(event.target.value)}
                    aria-invalid={show("reason") && topic ? "true" : undefined}
                  >
                    <option value="">{topicInfo ? "Select a reason" : "Choose a topic first"}</option>
                    {topicInfo?.reasons.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                {show("reason") && topic && <span className="rod-error">{show("reason")}</span>}
              </div>

              <div className="rod-field">
                <label htmlFor="rod-description">Describe the problem</label>
                <textarea
                  id="rod-description"
                  rows={6}
                  maxLength={DESC_MAX}
                  value={description}
                  placeholder="What went wrong? Include dates, what the seller or delivery partner said, and what you expected."
                  onChange={(event) => setDescription(event.target.value)}
                  aria-invalid={show("description") ? "true" : undefined}
                />
                <div className="rod-meta">
                  <span className="rod-error">{show("description")}</span>
                  <small>
                    {description.length}/{DESC_MAX}
                  </small>
                </div>
              </div>

              <div className="rod-field">
                <label>
                  Photos <em>optional, up to {MAX_PHOTOS}</em>
                </label>

                <div className="rod-photos">
                  {photos.map((src, i) => (
                    <div className="rod-photo" key={i}>
                      <img src={src} alt={`Evidence ${i + 1}`} />
                      <button
                        type="button"
                        onClick={() => setPhotos((current) => current.filter((_, index) => index !== i))}
                        aria-label={`Remove photo ${i + 1}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  {photos.length < MAX_PHOTOS && (
                    <button type="button" className="rod-photo-add" onClick={() => fileRef.current?.click()}>
                      <img src="/images/products/default-item.jpg" alt="" />
                      <b>Add photo</b>
                    </button>
                  )}
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(event) => {
                    addPhotos(event.target.files);
                    event.target.value = "";
                  }}
                />

                {photoError && <span className="rod-error">{photoError}</span>}
              </div>
            </div>
          </section>

          <div className="rod-form-actions">
            <button type="button" className="rod-btn primary" onClick={submit}>
              Submit report
            </button>
            <Link to={`/remaker-orders/${order.id}`} className="rod-btn ghost">
              Cancel
            </Link>
          </div>
        </div>

        <aside className="rod-side">
          <OrderSummary order={order} />

          <section className="rod-panel">
            <h3>What happens next</h3>
            <ol className="rod-next">
              <li>
                <strong>We review it</strong>
                <small>Our team looks at your report within 24 hours.</small>
              </li>
              <li>
                <strong>We contact the seller</strong>
                <small>They get a chance to respond before we decide.</small>
              </li>
              <li>
                <strong>You get a result</strong>
                <small>The outcome shows up on this order, including any refund.</small>
              </li>
            </ol>
          </section>
        </aside>
      </div>
    </section>
  );
}
