import React, { useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";

import {
  createAddress,
  deleteAddress,
  editAddress,
  makeDefaultAddress,
  useServerAddresses,
} from "../../data/checkoutStore";
import ConfirmModal from "../../components/ui/ConfirmModal";
import AddressForm from "../Shop/components/AddressForm";
import { PageLoader } from "../../../shared/components/Spinner";

/* The saved-address list: add, edit, remove, choose the default. Used by the Addresses page
   on every portal. */
export default function AddressBook({ show }) {
  const { addresses, defaultId, loading, error, reload } = useServerAddresses();

  const [mode, setMode] = useState(null); // null | "new" | address id
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  /* one place for every address change: spinner, server messages, toast */
  const run = async (task, done) => {
    setSaving(true);
    setFieldErrors({});
    try {
      await task();
      setMode(null);
      if (done) show(done);
    } catch (e) {
      setFieldErrors(e.errors || {});
      if (!e.errors)
        show(e.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const [removing, setRemoving] = useState(null);

  return (
    <section className="dn-card ust-card">
      <div className="dn-card-head">
        <div>
          <h2>Addresses</h2>

          <small>
            Your default address is filled in automatically at checkout and when
            you donate.
          </small>
        </div>

        {mode === null && (
          <button
            type="button"
            className="dn-btn dn-btn--sm"
            onClick={() => setMode("new")}
          >
            <Plus size={14} /> Add address
          </button>
        )}
      </div>

      {loading && addresses.length === 0 && (
        <PageLoader label="Loading your addresses…" minHeight={120} />
      )}
      {error && addresses.length === 0 && (
        <p className="dn-error" role="alert">
          {error}{" "}
          <button type="button" className="dn-link" onClick={reload}>
            Try again
          </button>
        </p>
      )}
      <div className="ust-addrs">
        {addresses.map((a) =>
          mode === a.id ? (
            <AddressForm
              key={a.id}
              initial={a}
              saving={saving}
              serverErrors={fieldErrors}
              onCancel={() => setMode(null)}
              onSave={(v) =>
                run(() => editAddress(a.id, v), "Address updated.")
              }
            />
          ) : (
            <article key={a.id} className="ust-addr">
              <span>
                <MapPin size={18} />
              </span>

              <div>
                <div className="ust-addr-top">
                  <strong>{a.name}</strong>

                  <em>{a.label}</em>

                  {defaultId === a.id && <em className="def">Default</em>}
                </div>

                <p>
                  {a.line}, {a.city}, {a.state} {a.pincode}
                </p>

                <small>{a.phone}</small>
              </div>

              <div className="ust-addr-actions">
                <button
                  type="button"
                  className="dn-btn dn-btn--ghost dn-btn--sm"
                  onClick={() => setMode(a.id)}
                >
                  <Pencil size={13} /> Edit
                </button>

                {defaultId !== a.id && (
                  <button
                    type="button"
                    className="dn-btn dn-btn--soft dn-btn--sm"
                    disabled={saving}
                    onClick={() =>
                      run(
                        () => makeDefaultAddress(a.id),
                        "Default address changed.",
                      )
                    }
                  >
                    Make default
                  </button>
                )}

                {addresses.length > 1 && (
                  <button
                    type="button"
                    className="dn-btn dn-btn--danger dn-btn--sm"
                    onClick={() => setRemoving(a)}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </article>
          ),
        )}
      </div>

      {mode === "new" && (
        <AddressForm
          saving={saving}
          serverErrors={fieldErrors}
          onCancel={() => setMode(null)}
          onSave={(v) => run(() => createAddress(v), "Address added.")}
        />
      )}

      {removing && (
        <ConfirmModal
          icon={Trash2}
          title="Remove this address?"
          confirmLabel="Remove"
          cancelLabel="Keep it"
          onClose={() => setRemoving(null)}
          onConfirm={() => {
            const target = removing;
            setRemoving(null);
            run(() => deleteAddress(target.id), "Address removed.");
          }}
        >
          <p>
            {removing.label}: {removing.line}, {removing.city}.
          </p>
        </ConfirmModal>
      )}
    </section>
  );
}
