import { useCallback, useEffect, useRef, useState } from "react";
import { getAccount, updateAccount } from "../../api/session";
import {
  fetchProfile,
  imageProblem,
  removeImage,
  saveProfile,
  uploadImage,
} from "../../api/profile";

/*
  const p = useMyProfile("user" | "remaker");
  p.account, p.profile   what the server has
  p.loading, p.error     first load
  p.busy                 a save or upload is running
  p.save(payload)        -> { ok, message, errors }
  p.setImage("photo"|"cover", file) / p.clearImage(kind)  -> { ok, message }
  After every change the cached account is refreshed, so the header and the
  sidebar show the new name and picture straight away.
*/
export default function useMyProfile(type) {
  const [state, setState] = useState({ account: null, profile: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const remember = useCallback(
    (account, profile) => {
      const next = { account, profile };
      if (alive.current) setState(next);
      updateAccount(type, { ...(getAccount(type) || {}), ...account, profile });
    },
    [type],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchProfile(type);
      remember(data.account, data.profile);
    } catch (e) {
      if (alive.current) setError(e.message || "Could not load your profile.");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [type, remember]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (payload) => {
    setBusy(true);
    try {
      const data = await saveProfile(type, payload);
      remember(data.account, data.profile);
      return { ok: true, message: "Profile updated successfully." };
    } catch (e) {
      return { ok: false, message: e.message, errors: e.errors || {} };
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const mergeProfile = (profile, message) => {
    remember(state.account, profile);
    return { ok: true, message };
  };

  const setImage = async (kind, file) => {
    const problem = imageProblem(file);
    if (problem) return { ok: false, message: problem };
    setBusy(true);
    try {
      const profile = await uploadImage(type, kind, file);
      return mergeProfile(profile, kind === "cover" ? "Cover image updated." : "Profile photo updated.");
    } catch (e) {
      return { ok: false, message: e.errors?.image?.[0] || e.message };
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const clearImage = async (kind) => {
    setBusy(true);
    try {
      const profile = await removeImage(type, kind);
      return mergeProfile(profile, kind === "cover" ? "Cover image removed." : "Profile photo removed.");
    } catch (e) {
      return { ok: false, message: e.message };
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  return { ...state, loading, error, busy, reload: load, save, setImage, clearImage };
}
