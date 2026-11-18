import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Card, Field, SaveBar, useDraft } from "./Controls";

/* Name, studio handle and phone, saved to /api/remakers/profile/. Email is the sign-in address. */
export default function AccountSection({ me, onDirty, notify }) {
  const saved = useMemo(
    () => ({
      full_name: me.account?.full_name || "",
      username: me.account?.username || "",
      phone: me.profile?.phone || "",
    }),
    [me.account, me.profile],
  );
  const { draft, set, dirty, reset } = useDraft(saved, "account", onDirty);
  const [errors, setErrors] = useState({});

  const save = async () => {
    const next = {};
    if (!draft.full_name.trim()) next.full_name = "Enter your name.";
    if (draft.username && !/^[a-zA-Z0-9_.]{3,30}$/.test(draft.username))
      next.username = "3 to 30 letters, numbers, dots or underscores.";
    if (draft.phone && !/^[6-9]\d{9}$/.test(draft.phone.replace(/\D/g, "").slice(-10)))
      next.phone = "Enter a 10-digit Indian mobile number.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const r = await me.save({
      full_name: draft.full_name.trim(),
      username: draft.username.trim(),
      phone: draft.phone.trim() || null,
    });
    if (r.ok) notify("Account saved.");
    else {
      const e = r.errors || {};
      setErrors({
        full_name: e.full_name?.[0],
        username: e.username?.[0],
        phone: e.phone?.[0] || e.profile?.phone?.[0],
      });
      notify(r.message || "Not saved. Check the fields.");
    }
  };

  if (me.loading) return <p className="set-note">Loading your account…</p>;

  return (
    <div className="set-stack">
      <Card title="About you" note="Shown on your orders and messages.">
        <div className="set-grid">
          <Field label="Full name" htmlFor="set-name" error={errors.full_name}>
            <input
              id="set-name"
              type="text"
              value={draft.full_name}
              maxLength={120}
              onChange={(e) => set("full_name", e.target.value)}
            />
          </Field>
          <Field
            label="Studio handle"
            htmlFor="set-user"
            error={errors.username}
            hint="Used in your studio link."
          >
            <input
              id="set-user"
              type="text"
              value={draft.username}
              maxLength={30}
              onChange={(e) => set("username", e.target.value)}
            />
          </Field>
          <Field label="Phone" htmlFor="set-phone" error={errors.phone} hint="Only ReOrbit's pickup team sees it.">
            <input
              id="set-phone"
              type="text"
              inputMode="tel"
              value={draft.phone}
              maxLength={14}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field label="Email" htmlFor="set-email" hint="Your sign-in address. Contact support to change it.">
            <input id="set-email" type="text" value={me.account?.email || ""} readOnly disabled />
          </Field>
        </div>
      </Card>

      <p className="set-note">
        Photo, cover, bio, skills, city and address are on your{" "}
        <Link to="/remaker-profile">studio profile</Link>.
      </p>

      <SaveBar dirty={dirty} onSave={save} onReset={reset} disabled={me.busy} />
    </div>
  );
}
