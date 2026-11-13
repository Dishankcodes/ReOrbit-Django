import React from "react";
import ChatThread from "../../../../user/pages/Messages/components/ChatThread";

export default function AdminChatThread(props) {
  return <ChatThread {...props} adminMode />;
}
