import React from "react";

import MessagesScreen from "../../../shared/messaging/MessagesScreen";

import "../../../remaker/css/ReMakerUi.css";
import "./UserMessages.css";

export default function UserMessages() {
  return <MessagesScreen sideName="user" />;
}
