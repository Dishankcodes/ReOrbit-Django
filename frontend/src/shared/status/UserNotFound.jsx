import React from "react";

import NotFoundView from "./NotFoundView";

/* Unknown address inside the member app: shown inside the member layout, sidebar included. */
export default function UserNotFound() {
  return (
    <NotFoundView
      theme="user"
      home={{ to: "/user-dashboard", label: "Go to dashboard" }}
      help={{ to: "/user-help", label: "Help and support" }}
      links={[
        { to: "/user-marketplace", label: "Marketplace", note: "Find something new" },
        { to: "/user-orders", label: "Orders", note: "Track your purchases" },
        { to: "/user-donations", label: "Donations", note: "Give items a second life" },
        { to: "/user-messages", label: "Messages", note: "Chat with sellers" },
      ]}
    />
  );
}
