import React from "react";

import { saveSection } from "../../../data/settingsStore";
import {
  Card,
  Field,
  Row,
  SaveBar,
  Segmented,
  Toggle,
  useDraft,
} from "./Controls";

export default function StudioSection({ settings, onDirty, notify }) {
  const { draft, set, dirty, reset } = useDraft(
    settings.studio,
    "studio",
    onDirty,
  );
  const [attempted, setAttempted] = React.useState(false);

  const vacationError =
    draft.vacation && !draft.vacationUntil
      ? "Choose the date you are back."
      : draft.vacation &&
          new Date(draft.vacationUntil) < new Date(new Date().toDateString())
        ? "The return date has already passed."
        : "";

  const noMethod = !draft.offerPickup && !draft.offerDelivery;

  const save = () => {
    setAttempted(true);
    if (vacationError || noMethod) return;

    saveSection("studio", draft);
    setAttempted(false);
    notify("Studio settings saved.");
  };

  const backLabel = draft.vacationUntil
    ? new Date(draft.vacationUntil).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
      })
    : "the date you choose";

  return (
    <div className="set-stack">
      <Card
        title="Vacation mode"
        note="Pause new orders while you are away. Orders you already accepted are not affected."
      >
        <Row
          title="I am away"
          note="Your products stay visible but buyers cannot order until you are back."
        >
          <Toggle
            checked={draft.vacation}
            onChange={(value) => set("vacation", value)}
            label="Vacation mode"
          />
        </Row>

        {draft.vacation && (
          <div className="set-reveal">
            <div className="set-grid">
              <Field
                label="Back on"
                htmlFor="set-until"
                error={attempted ? vacationError : ""}
              >
                <input
                  id="set-until"
                  type="date"
                  value={draft.vacationUntil}
                  onChange={(e) => set("vacationUntil", e.target.value)}
                  aria-invalid={attempted && vacationError ? "true" : undefined}
                />
              </Field>
            </div>

            <Field
              label="Message to customers"
              htmlFor="set-vac-msg"
              hint={`${draft.vacationMessage.length}/200`}
            >
              <textarea
                id="set-vac-msg"
                rows={3}
                maxLength={200}
                value={draft.vacationMessage}
                onChange={(e) => set("vacationMessage", e.target.value)}
              />
            </Field>

            <div className="set-preview">
              <small>What customers see</small>
              <strong>Studio on a break until {backLabel}</strong>
              <p>{draft.vacationMessage || "No message"}</p>
            </div>
          </div>
        )}
      </Card>

      <Card
        title="Orders and shipping"
        note="Decide how customers can get what they buy."
      >
        <Row
          title="Customers can collect from me"
          note="Free for the buyer. You hand the item over in person."
        >
          <Toggle
            checked={draft.offerPickup}
            onChange={(value) => set("offerPickup", value)}
            label="Offer pickup"
          />
        </Row>
        <Row
          title="ReOrbit delivers my items"
          note="ReOrbit collects from your address. The buyer pays the delivery fee."
        >
          <Toggle
            checked={draft.offerDelivery}
            onChange={(value) => set("offerDelivery", value)}
            label="Offer delivery"
          />
        </Row>

        {attempted && noMethod && (
          <p className="set-error block">
            Keep at least one option on, or customers cannot buy from you.
          </p>
        )}

        <div className="set-grid pad">
          <Field
            label="Time to pack an order"
            htmlFor="set-handling"
            hint="How long you need before it is ready for pickup."
          >
            <div className="set-select">
              <select
                id="set-handling"
                value={draft.handlingDays}
                onChange={(e) => set("handlingDays", Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 7].map((days) => (
                  <option key={days} value={days}>
                    {days} {days === 1 ? "day" : "days"}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Field
            label="Returns"
            htmlFor="set-returns"
            hint="How long customers have to return an item."
          >
            <div className="set-select">
              <select
                id="set-returns"
                value={draft.returnWindow}
                onChange={(e) => set("returnWindow", e.target.value)}
              >
                <option value="0">No returns</option>
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
              </select>
            </div>
          </Field>
        </div>

        <Field
          label="Packaging note"
          htmlFor="set-pack"
          hint="Shown on your products. Say how you wrap items."
        >
          <textarea
            id="set-pack"
            rows={3}
            maxLength={160}
            value={draft.packagingNote}
            onChange={(e) => set("packagingNote", e.target.value)}
          />
        </Field>
      </Card>

      <Card title="Studio visibility">
        <Row
          title="Public studio profile"
          note="Anyone on ReOrbit can find your studio and portfolio."
        >
          <Toggle
            checked={draft.profilePublic}
            onChange={(value) => set("profilePublic", value)}
            label="Public profile"
          />
        </Row>
        <Row title="Show my city" note="Buyers see where you are based.">
          <Toggle
            checked={draft.showLocation}
            onChange={(value) => set("showLocation", value)}
            label="Show city"
          />
        </Row>
      </Card>

      <SaveBar dirty={dirty} onSave={save} onReset={reset} />
    </div>
  );
}
