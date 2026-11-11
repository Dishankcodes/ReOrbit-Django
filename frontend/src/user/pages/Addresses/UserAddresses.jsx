import React, { useEffect } from "react";

import useToast from "../../components/ui/useToast";
import AddressBook from "./AddressBook";

import "../../css/shared/ui-base.css";
import "../../css/settings/UserSettings.css";

/* One address book for members, ReMakers and admins (the route decides the portal).
   The default address is what checkout and donation pickups fill in by themselves. */
export default function UserAddresses() {
  const { toast, show } = useToast();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="dn st">
      <header className="ust-head">
        <span className="dn-eyebrow">Account</span>
        <h1>My addresses</h1>
        <p className="dn-muted">
          Save the places you receive orders and hand over donations. Your default address is filled in for you.
        </p>
      </header>

      <AddressBook show={show} />
      {toast}
    </div>
  );
}
