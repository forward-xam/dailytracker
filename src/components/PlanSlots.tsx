"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  PLAN_HORIZONS,
  type AppState,
  type PlanHorizon,
  type PlanItem,
} from "@/lib/types";

interface PlanSlotsProps {
  state: AppState;
  onAdd: (horizon: PlanHorizon, text: string) => void;
  onToggleComplete: (item: PlanItem, completed: boolean) => void;
  onToggleDaily: (item: PlanItem, done: boolean) => void;
  onDelete: (item: PlanItem) => void;
  onEditText: (item: PlanItem, text: string) => void;
}

export function PlanSlots({
  state,
  onAdd,
  onToggleComplete,
  onToggleDaily,
  onDelete,
  onEditText,
}: PlanSlotsProps) {
  const [open, setOpen] = useState<PlanHorizon | null>(null);
  const [drafts, setDrafts] = useState<Record<PlanHorizon, string>>({
    "10y": "",
    "1y": "",
    "1m": "",
    "1d": "",
  });

  const progressMap = useMemo(() => {
    return new Map(state.planProgress.map((p) => [p.horizon, p] as const));
  }, [state.planProgress]);

  function submit(horizon: PlanHorizon, e: FormEvent) {
    e.preventDefault();
    const text = drafts[horizon]?.trim();
    if (!text) return;
    onAdd(horizon, text);
    setDrafts((prev) => ({ ...prev, [horizon]: "" }));
  }

  return (
    <div className="plan-slots">
      <div className="plan-slots__title">
        <h2>Your plans</h2>
        <p>Tap a slot to write and check off plans.</p>
      </div>

      {PLAN_HORIZONS.map((meta) => {
        const progress = progressMap.get(meta.id);
        const items = state.plans[meta.id] ?? [];
        const isOpen = open === meta.id;
        const pct = Math.round((progress?.progress ?? 0) * 100);

        return (
          <div
            key={meta.id}
            className={`plan-slot ${isOpen ? "plan-slot--open" : ""}`}
          >
            <button
              type="button"
              className="plan-slot__head"
              onClick={() => setOpen(isOpen ? null : meta.id)}
              aria-expanded={isOpen}
            >
              <div className="plan-slot__labels">
                <strong>{meta.label}</strong>
                <span>
                  {items.length === 0
                    ? "Empty — tap to add"
                    : `${progress?.completedCount ?? 0}/${items.length} done`}
                </span>
              </div>
              <div className="plan-slot__right">
                <span className="plan-slot__pct">{pct}%</span>
                <span className="plan-slot__chev">{isOpen ? "−" : "+"}</span>
              </div>
            </button>

            {isOpen && (
              <div className="plan-slot__body">
                <p className="plan-slot__hint">{meta.hint}</p>

                <form
                  className="plan-add"
                  onSubmit={(e) => submit(meta.id, e)}
                >
                  <input
                    value={drafts[meta.id]}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [meta.id]: e.target.value,
                      }))
                    }
                    placeholder={
                      meta.id === "1d"
                        ? "Add a plan for today…"
                        : `Add a ${meta.label.replace(" plans", "")} plan…`
                    }
                    autoFocus
                  />
                  <button type="submit" className="btn btn--primary">
                    Add
                  </button>
                </form>

                <ul className="plan-list">
                  {items.map((item) => {
                    const checked =
                      meta.id === "1d"
                        ? Boolean(state.today.planDone?.[item.id])
                        : item.completed;
                    return (
                      <li
                        key={item.id}
                        className={`plan-item ${checked ? "plan-item--done" : ""}`}
                      >
                        <button
                          type="button"
                          className={`check ${checked ? "check--on" : ""}`}
                          onClick={() => {
                            if (meta.id === "1d") {
                              onToggleDaily(item, !checked);
                            } else {
                              onToggleComplete(item, !checked);
                            }
                          }}
                          aria-pressed={checked}
                        >
                          <span className="check__mark">
                            {checked ? "✓" : ""}
                          </span>
                        </button>
                        <input
                          className="plan-item__text"
                          defaultValue={item.text}
                          onBlur={(e) => {
                            const next = e.target.value.trim();
                            if (next && next !== item.text) {
                              onEditText(item, next);
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => onDelete(item)}
                        >
                          Delete
                        </button>
                      </li>
                    );
                  })}
                  {items.length === 0 && (
                    <li className="empty">
                      No items yet. Add your first plan above.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
