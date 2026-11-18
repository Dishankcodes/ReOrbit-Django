import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/api";
import { readBlock } from "./liveAccountStatus";

/* The public "Contact us" form (POST /api/support/contact/), shared by /contact and
   /remakers-contact. It pre-fills from the link (?topic=&subject=&message=&email=) and, after an
   account was blocked, from the blocked notice, so an appeal is one tap away.
   `topicMap` turns a page's own topic values into the server's topic keys. */
export default function useContactForm(side = "user", topicMap = {}) {
  const [params] = useSearchParams();
  const notice = readBlock();
  const appeal = !!notice && (params.get("topic") === "blocked" || !params.get("topic"));
  const [vals, setVals] = useState(() => ({
    name: params.get("name") || "",
    email: params.get("email") || "",
    topic: params.get("topic") || (appeal ? "blocked" : ""),
    subject:
      params.get("subject") ||
      (appeal ? (notice.status === "Deleted" ? "Please review my closed account" : "Please review my blocked account") : ""),
    message:
      params.get("message") ||
      (appeal && notice.reason ? `My account was blocked with the reason: "${notice.reason}". ` : ""),
  }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // server message once sent
  const [error, setError] = useState("");

  const set = (key) => (e) => {
    setVals((v) => ({ ...v, [key]: e.target.value }));
    setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await apiRequest("/support/contact/", {
        method: "POST",
        auth: false,
        body: { ...vals, topic: topicMap[vals.topic] || vals.topic, side },
      });
      setDone(r.message || "Thanks, your message is with our team.");
    } catch (err) {
      const fe = {};
      Object.entries(err.errors || {}).forEach(([k, v]) => {
        fe[k] = Array.isArray(v) ? v[0] : v;
      });
      setErrors(fe);
      setError(Object.keys(fe).length ? "" : err.message || "We couldn't send that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return { vals, set, errors, busy, done, error, submit, appeal };
}
