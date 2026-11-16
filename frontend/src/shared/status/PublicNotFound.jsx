import React from "react";

import Footer from "../../user/components/Footer";
import Navbar from "../../user/components/Navbar";
import NotFoundView from "./NotFoundView";

/* Unknown public address: the normal website header and footer around a real 404. */
export default function PublicNotFound() {
  return (
    <>
      <Navbar />
      <NotFoundView
        theme="public"
        full
        home={{ to: "/", label: "Back to home" }}
        help={{ to: "/contact", label: "Contact us" }}
        links={[
          { to: "/discover-marketplace", label: "Marketplace", note: "Browse reworked pieces" },
          { to: "/discover-remakers", label: "ReMakers", note: "Meet the makers" },
          { to: "/how-it-works", label: "How it works", note: "Reuse, rework, resell" },
          { to: "/faq", label: "FAQ", note: "Quick answers" },
        ]}
      />
      <Footer />
    </>
  );
}
