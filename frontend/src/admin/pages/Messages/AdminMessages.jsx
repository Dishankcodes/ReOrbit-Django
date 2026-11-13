import React from "react";
import UserMessages from "../../../user/pages/Messages/UserMessages";
import AdminChatThread from "./components/ChatThread";
import AdminConversationList from "./components/ConversationList";
import "./AdminMessages.css";

export default function AdminMessages() {
  return (
    <div className="admin-messaging-page">
      <UserMessages
        adminMode
        ChatThreadComponent={AdminChatThread}
        ConversationListComponent={AdminConversationList}
      />
    </div>
  );
}
