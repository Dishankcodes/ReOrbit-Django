import React from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { startConversation } from "../../data/messagesStore";

/* Opens (or starts) the chat with someone about something.
   target: { key, kind, name, subtitle, image, context } - see messagesStore.startConversation */
export default function MessageButton({
  target,
  label = "Message",
  className = "dn-btn dn-btn--ghost",
  iconSize = 15,
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          const id = await startConversation(target);
          navigate(`/user-messages/${id}`);
        } catch (error) {
          window.dispatchEvent(new CustomEvent("reorbit:toast", { detail: error.message }));
        }
      }}
    >
      <MessageCircle size={iconSize} /> {label}
    </button>
  );
}
