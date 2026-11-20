import React from "react";

import HelpNav from "./components/HelpNav";
import MyReports from "../../../shared/components/MyReports";

import "../../css/shared/ui-base.css";
import "../../css/help/UserHelp.css";

/* Help › My reports: the sellers, ReMakers, listings and reviews this member reported, and the
   team's answer. Notifications about a report open this page on it (?report=CP-1001). */
export default function UserReports() {
  return (
    <div className="dn hp">
      <HelpNav />
      <header className="uhp-head row">
        <div>
          <p className="dn-muted">
            Everything you reported with the Report button, and what our team did about it.
          </p>
        </div>
      </header>
      <MyReports side="user" />
    </div>
  );
}
