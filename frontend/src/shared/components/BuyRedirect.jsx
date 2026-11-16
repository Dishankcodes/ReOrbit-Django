import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { getAccessToken, getRefreshToken, loginUrl } from "../../api/session";

/* Public "Buy now" link: /buy/<product id>  (add ?as=remaker for ReMaker banners).
   Signed in: straight to that product's page. Not signed in: log in first, and the login
   page sends them back to the same product. */
const has = (t) => !!(getAccessToken(t) || getRefreshToken(t));

export default function BuyRedirect() {
  const { productId } = useParams();
  const [q] = useSearchParams();
  const id = encodeURIComponent(productId || "");
  const member = `/user-marketplace/product/${id}`;
  const maker = `/remaker-marketplace/product/${id}`;
  /* ?as=remaker says it outright; otherwise a visitor who came from a ReMaker page is a ReMaker. */
  let fromMaker = false;
  try {
    fromMaker = /^\/remaker/.test(new URL(document.referrer).pathname);
  } catch {
    /* no referrer */
  }
  const wantsMaker = q.get("as") ? q.get("as") === "remaker" : fromMaker;

  if (wantsMaker ? has("remaker") : has("user")) {
    return <Navigate to={wantsMaker ? maker : member} replace />;
  }
  // Signed in on the other side only: use that side rather than asking for a second login.
  if (!wantsMaker && has("remaker")) return <Navigate to={maker} replace />;
  return (
    <Navigate
      to={wantsMaker ? loginUrl("remaker", maker) : loginUrl("user", member)}
      replace
    />
  );
}
