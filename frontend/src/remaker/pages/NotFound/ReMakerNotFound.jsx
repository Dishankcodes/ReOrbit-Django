import React from "react";

import NotFoundView from "../../../shared/status/NotFoundView";

/* Shown for any /remaker... address that does not exist (inside the ReMaker layout) */
export default function ReMakerNotFound() {
  return (
    <NotFoundView
      theme="remaker"
      home={{ to: "/remaker-dashboard", label: "Go to dashboard" }}
      help={{ to: "/remaker-help", label: "Help and support" }}
      links={[
        { to: "/remaker-products", label: "Products", note: "Manage what you sell" },
        { to: "/remaker-sales", label: "Sales", note: "Orders from customers" },
        { to: "/remaker-marketplace", label: "Marketplace", note: "Find items to rework" },
        { to: "/remaker-messages", label: "Messages", note: "Chat with customers" },
      ]}
    />
  );
}
