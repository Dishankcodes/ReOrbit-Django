import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { startConversation } from "../../data/messagesStore";
import { getAccountType } from "../../../api/session";

/* Opens (or starts) the chat with someone about something.
   target: { key, kind, name, subtitle, image, context } - see messagesStore.startConversation */
export default function MessageButton({
  target,
  label = "Message",
  className = "dn-btn dn-btn--ghost",
  iconSize = 15,
}) {
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={opening}
      onClick={async () => {
        if (opening) return;
        setOpening(true);
        try {
          const id = await startConversation(target);
          const accountType = getAccountType();
          const base = accountType === "admin"
            ? "/admin-messages"
            : accountType === "remaker"
              ? "/remaker-messages"
              : "/user-messages";
          navigate(`${base}/${id}`);
        } catch (error) {
          window.dispatchEvent(new CustomEvent("reorbit:toast", { detail: error.message }));
        } finally {
          setOpening(false);
        }
      }}
    >
      <MessageCircle size={iconSize} /> {label}
    </button>
  );
}
