import React, { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

import "./status.css";

/* A slim bar when the connection drops, and a short "back online" when it returns.
   It floats above the page and changes no layout. */
export default function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let timer = 0;
    const down = () => {
      window.clearTimeout(timer);
      setRestored(false);
      setOnline(false);
    };
    const up = () => {
      setOnline(true);
      setRestored(true);
      timer = window.setTimeout(() => setRestored(false), 2500);
    };
    window.addEventListener("offline", down);
    window.addEventListener("online", up);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("offline", down);
      window.removeEventListener("online", up);
    };
  }, []);

  if (online && !restored) return null;
  return (
    <div className={`stx-offline ${online ? "back" : ""}`} role="status" aria-live="polite">
      {online ? <Wifi size={15} /> : <WifiOff size={15} />}
      {online
        ? "You are back online."
        : "You are offline. Some things may not load or save until you are back."}
    </div>
  );
}
