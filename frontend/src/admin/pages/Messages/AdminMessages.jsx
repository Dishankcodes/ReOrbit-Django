import React from "react";

import MessagesScreen from "../../../shared/messaging/MessagesScreen";

import "../../../remaker/css/ReMakerUi.css";
import "../../../user/pages/Messages/UserMessages.css";
import "./AdminMessages.css";

export default function AdminMessages() {
  return (
    <div className="admin-messaging-page">
      <MessagesScreen sideName="admin" />
    </div>
  );
}
