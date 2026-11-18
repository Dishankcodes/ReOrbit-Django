/* Once a page knows the name of what it shows, swap an ID-only (or outdated) address for the
   readable one without adding a history entry: /product/RPR-1001 -> /product/teak-table-RPR-1001.
   `path` is built with productPath / sellerPath / remakerPath (member paths; portalRouter maps
   them to the ReMaker or admin side). */
import { useEffect } from "react";
import { useLocation, useNavigate } from "./portalRouter";

export default function useReadableAddress(raw, path) {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!path || !raw) return;
    const want = path.split("/").pop();
    let have = raw;
    try {
      have = decodeURIComponent(raw);
    } catch {
      /* keep as is */
    }
    if (have !== want) navigate(path + location.search + location.hash, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, path]);
}
