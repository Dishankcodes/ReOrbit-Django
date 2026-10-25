import React, { useState } from "react";
import { Ban } from "lucide-react";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import { CANCEL_REASONS } from "../../../data/ordersStore";

export default function CancelOrderModal({ order, onConfirm, onClose }) {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);

  return (
    <ConfirmModal
      icon={Ban}
      title="Cancel this order?"
      confirmLabel="Yes, cancel order"
      onClose={onClose}
      onConfirm={() => onConfirm(reason)}
    >
      <p>
        {order.id} · {order.item.title}. You'll get a full refund of ₹
        {order.total.toLocaleString("en-IN")} to the original payment method
        within 5–7 working days.
      </p>
      <label className="dn-field">
        <span className="dn-label">Why are you cancelling?</span>
        <select
          className="dn-select"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          {CANCEL_REASONS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
    </ConfirmModal>
  );
}
