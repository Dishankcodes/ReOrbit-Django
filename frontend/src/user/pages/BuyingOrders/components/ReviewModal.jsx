import React, { useState } from "react";
import { Star } from "lucide-react";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import { StarInput } from "../../../components/ui/Stars";

export default function ReviewModal({ order, onSubmit, onClose }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!rating) {
      setError("Tap a star to rate your experience.");
      return;
    }
    onSubmit({ rating, text: text.trim(), at: new Date().toISOString() });
  };

  return (
    <ConfirmModal
      icon={Star}
      tone="primary"
      title={`Rate ${order.seller?.name || "the seller"}`}
      confirmLabel="Submit review"
      cancelLabel="Not now"
      onClose={onClose}
      onConfirm={submit}
    >
      <p>
        How was <strong>{order.item.title}</strong>? Your review appears on{" "}
        {order.seller?.name}'s profile and helps other buyers.
      </p>
      <StarInput
        value={rating}
        onChange={(value) => {
          setRating(value);
          setError("");
        }}
      />
      <label className="dn-field">
        <span className="dn-label">
          Your review <span className="dn-hint">(optional)</span>
        </span>
        <textarea
          className="dn-textarea"
          style={{ minHeight: 90 }}
          maxLength={300}
          value={text}
          placeholder="Condition, packaging, communication…"
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      {error && <span className="dn-error">{error}</span>}
    </ConfirmModal>
  );
}
