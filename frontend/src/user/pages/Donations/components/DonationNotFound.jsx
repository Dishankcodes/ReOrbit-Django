import React from "react";
import { SearchX } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";

export default function DonationNotFound() {
  return (
    <div className="dn">
      <EmptyState
        icon={SearchX}
        title="We couldn't find that donation"
        text="It may have been removed, or the link is incorrect. Check your donation history to find it."
        actionLabel="Go to donation history"
        to="/user-donations/history"
      />
    </div>
  );
}
