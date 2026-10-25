import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Gift,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Calculator,
} from "lucide-react";
import { useRules, saveRule } from "../../../data/rewardsStore";

const GROUP_ICON = { Buying: ShoppingBag, Donating: Gift, Community: Sparkles };

function RuleRow({ rule, toast }) {
  const [value, setValue] = useState(String(rule.points));
  const dirty = Number(value) !== rule.points;
  const save = () => {
    const n = Number(value);
    if (!(n >= 0) || value === "") {
      setValue(String(rule.points));
      return;
    }
    saveRule(rule.id, { points: n });
    toast(`“${rule.title}” now gives ${n} points.`);
  };
  return (
    <li className={`rw-rule ${rule.active ? "" : "off"}`}>
      <div className="rw-rule-text">
        <strong>{rule.title}</strong>
        <p>{rule.description}</p>
      </div>
      <div className="rw-rule-points">
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          aria-label={`Points for ${rule.title}`}
          disabled={!rule.active}
        />
        <span>
          pts<small>{rule.unit}</small>
        </span>
        {dirty && (
          <button
            type="button"
            className="ad-btn ad-btn-primary ad-btn-sm"
            onClick={save}
          >
            Save
          </button>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={rule.active}
        aria-label={`${rule.title} is ${rule.active ? "on" : "off"}`}
        className={`rw-switch ${rule.active ? "on" : ""}`}
        onClick={() => {
          saveRule(rule.id, { active: !rule.active });
          toast(`“${rule.title}” turned ${rule.active ? "off" : "on"}.`);
        }}
      >
        <i />
      </button>
    </li>
  );
}

export default function RulesTab({ toast }) {
  const rules = useRules();
  const groups = ["Buying", "Donating", "Community"];
  const base = rules.find((r) => r.id === "donationBase");
  const per = rules.find((r) => r.id === "donationItem");
  const sample =
    (base.active ? base.points : 0) + (per.active ? per.points * 3 : 0);

  return (
    <div className="rw-pane rw-rules">
      <div className="rw-rules-grid">
        {groups.map((g) => {
          const Icon = GROUP_ICON[g];
          return (
            <section key={g} className="aup-card">
              <header className="aup-card-head">
                <div>
                  <h3>
                    <Icon size={16} className="rw-h-icon" /> {g}
                  </h3>
                  <p>
                    {g === "Donating"
                      ? "Linked to the Donations module."
                      : g === "Buying"
                        ? "Earned on orders."
                        : "Earned for helping the community."}
                  </p>
                </div>
              </header>
              <ul className="rw-rule-list">
                {rules
                  .filter((r) => r.group === g)
                  .map((r) => (
                    <RuleRow key={r.id} rule={r} toast={toast} />
                  ))}
              </ul>
              {g === "Donating" && (
                <div className="rw-link-note">
                  <Calculator size={15} />
                  <p>
                    A donation of <b>3 items</b> earns the donor{" "}
                    <b>{sample} points</b> once it is Completed.
                  </p>
                  <Link to="/admin-donations" className="aup-link">
                    Open donations <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
