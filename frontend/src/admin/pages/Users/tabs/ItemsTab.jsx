import React, { useState } from "react";
import { Boxes, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";
import StatusBadge from "../../../components/ui/StatusBadge";
import ConfirmActionModal from "../../../components/ui/ConfirmActionModal";
import { reviewUserItem } from "../../../data/usersStore";
import { formatDate, formatINR } from "../../../utils/format";

const REJECT_ACTION = {
  key: "reject-item",
  tone: "danger",
  icon: "ban",
  needsReason: true,
  title: "Reject this item?",
  body: "The owner is told the item was rejected, together with your message. They can fix the listing and upload it again.",
  confirmLabel: "Reject item",
};

export default function ItemsTab({ user, toast }) {
  const [rejecting, setRejecting] = useState(null);

  if (user.items.length === 0) {
    return (
      <section className="aup-card">
        <EmptyState icon={Boxes} title="No items uploaded" text="Items this user lists on the marketplace will show up here." />
      </section>
    );
  }

  return (
    <>
      <div className="aup-items">
        {user.items.map((item) => (
          <article key={item.item_id} className="aup-item">
            <div className="aup-item-image">
              <img src={item.image} alt={item.title} />
              <StatusBadge status={item.item_status} className="aup-item-status" />
            </div>
            <div className="aup-item-body">
              <span className="aup-item-cat">{item.category}</span>
              <h4>{item.title}</h4>
              <div className="aup-item-meta">
                <strong>{formatINR(item.estimated_price)}</strong>
                <span>Qty {item.quantity}</span>
                <span>{item.condition} condition</span>
              </div>
              <div className="aup-item-foot">
                <StatusBadge status={item.verification_status} />
                <small>{formatDate(item.created_at)}</small>
              </div>

              {item.verification_status === "Rejected" && item.rejection_message && (
                <p className="aup-item-note"><AlertCircle size={14} /> {item.rejection_message}</p>
              )}

              {item.verification_status === "Pending" && (
                <div className="aup-item-actions">
                  <button
                    type="button"
                    className="ad-btn ad-btn-primary ad-btn-sm"
                    onClick={() => {
                      reviewUserItem(user.user_id, item.item_id, "Verified");
                      toast(`“${item.title}” verified and listed.`);
                    }}
                  >
                    <CheckCircle2 size={14} /> Verify
                  </button>
                  <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setRejecting(item)}>
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      <ConfirmActionModal
        action={rejecting ? REJECT_ACTION : null}
        targets={rejecting ? [rejecting.title] : []}
        onClose={() => setRejecting(null)}
        onConfirm={(message) => {
          reviewUserItem(user.user_id, rejecting.item_id, "Rejected", message);
          toast(`“${rejecting.title}” rejected. The owner will see your message.`);
          setRejecting(null);
        }}
      />
    </>
  );
}
