import { useEffect, useRef, useState } from "react";

/* "Continue with Google" button (popup, authorization-code flow).

   Click -> Google's popup -> we get a one-time `code` -> onCode(code) -> the page
   sends it to the ReOrbit server, which checks it with Google. The client secret
   stays on the server.

   Needs VITE_GOOGLE_CLIENT_ID in frontend/.env (see docs/GOOGLE_SETUP.md).
   Pass your own className and children so the button matches each page. */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let scriptPromise = null;

function loadGoogleScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = SCRIPT_SRC;
      tag.async = true;
      tag.defer = true;
      tag.onload = resolve;
      tag.onerror = () => {
        scriptPromise = null;
        reject(new Error("Could not load Google sign-in."));
      };
      document.head.appendChild(tag);
    });
  }
  return scriptPromise;
}

export default function GoogleButton({
  onCode,
  onError,
  disabled = false,
  className = "",
  children,
}) {
  const client = useRef(null);
  const onCodeRef = useRef(onCode);
  const onErrorRef = useRef(onError);
  const [ready, setReady] = useState(false);

  onCodeRef.current = onCode;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let alive = true;

    loadGoogleScript()
      .then(() => {
        if (!alive) return;
        client.current = window.google.accounts.oauth2.initCodeClient({
          client_id: CLIENT_ID,
          scope: "openid email profile",
          ux_mode: "popup",
          callback: (response) => {
            if (response?.code) onCodeRef.current?.(response.code);
            else if (response?.error && response.error !== "popup_closed") {
              onErrorRef.current?.("Google sign-in was cancelled.");
            }
          },
          error_callback: (err) => {
            // The person closing the popup is not an error worth showing.
            if (err?.type !== "popup_closed") {
              onErrorRef.current?.("Google sign-in failed. Please try again.");
            }
          },
        });
        setReady(true);
      })
      .catch((err) => alive && onErrorRef.current?.(err.message));

    return () => {
      alive = false;
    };
  }, []);

  const missing = !CLIENT_ID;

  return (
    <button
      type="button"
      className={className}
      disabled={disabled || missing || !ready}
      title={missing ? "Google sign-in is not set up yet." : undefined}
      onClick={() => client.current?.requestCode()}
    >
      {children}
    </button>
  );
}
