import React from "react";
import { Navigate, useParams } from "react-router-dom";
import { POLICY_PAGES, PolicyPage } from "./Terms";

/* /policies/<key>: any policy the team publishes in Admin › Content › Policies */
export default function PolicyRoute() {
  const { policyKey } = useParams();
  if (!POLICY_PAGES[policyKey]) return <Navigate to="/terms" replace />;
  return <PolicyPage policyKey={policyKey} />;
}
