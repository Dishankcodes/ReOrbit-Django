import React from "react";
import { SearchX } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";
import { PageLoader } from "../../../../shared/components/Spinner";
import { useDonationsStatus } from "../../../data/donationsStore";

export default function DonationNotFound() {
  const { loading, error } = useDonationsStatus();
  if (loading) return <PageLoader />;
  if (error)
    return (
      <div className="dn">
        <EmptyState
          icon={SearchX}
          title="Could not load your donations"
          text={error}
          actionLabel="Go to donation history"
          to="/user-donations/history"
        />
      </div>
    );
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
