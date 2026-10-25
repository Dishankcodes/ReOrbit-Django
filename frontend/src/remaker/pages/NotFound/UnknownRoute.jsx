import React from "react";
import { Navigate, useLocation } from "react-router-dom";

import ReMakerNotFound from "./ReMakerNotFound";

/* The last route in App.jsx. Unknown ReMaker addresses get the ReMaker 404
   page; anything else goes back to the home page. */
export default function UnknownRoute() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/remaker")) return <ReMakerNotFound />;

  return <Navigate to="/" replace />;
}
