"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  PLAN_HORIZONS,
  type AppState,
  type PlanHorizon,
  type PlanItem,
} from "@/lib/types";

interface PlansViewProps {
  state: AppState;
  busy: boolean;
  onAdd: (horizon: PlanHorizon, text: string) => void;
  onToggleComplete: (item: PlanItem, completed: boolean) => void;
  onToggleDaily: (item: PlanItem, done: boolean) => void;
  onDelete: (item: PlanItem) => void;
  onEditText: (item: PlanItem, text: string) => void;
}

export function PlansView({
  state,
  busy,
  onAdd,
  onToggleComplete,
  onToggleDaily,
  onDelete,
  onEditText,
}: PlansViewProps) {
  const [active, setActive] = useState<PlanHorizon>("1d");
  const [draft, setDraft] = useState("");

  const progressMap = useMemo(() => {
    const map = new Map(
      state.planProgress.map((p) => [p.horizon, p] as const),
    );
    return map;
  }, [state.planProgress]);

  const items = state.plans[active] ?? [];
  const progress = progressMap.get(active);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    onAdd(active, draft.trim());
    setDraft("");
  }

  return (
    <section className={`plans ${busy ? "is-busy" : ""}`}>
      <header className="section-head">
        <p className="brand">Day Mark</p>
        <h1>Plans</h1>
        <p>
          Write 10-year, 1-year, 1-month, and daily plans. Writing and finishing
          items both lift today’s %.
        </p>
      </header>

      <div className="plan-tabs">
        {PLAN_HORIZONS.map((h) => {
          const p = progressMap.get(h.id);
          const pct = Math.round((p?.progress ?? 0) * 100);
          return (
            <button
              key={h.id}
              type="button"
              className={active === h.id ? "plan-tab plan-tab--on" : "plan-tab"}
              onClick={() => setActive(h.id)}
            >
              <span>{h.label.replace(" plans", "")}</span>
              <strong>{pct}%</strong>
            </button>
          );
        })}
      </div>

      <div className="panel plan-panel">
        <div className="plan-panel__head">
          <div>
            <h2>{PLAN_HORIZONS.find((h) => h.id === active)?.label}</h2>
            <p>{PLAN_HORIZONS.find((h) => h.id === active)?.hint}</p>
          </div>
          <div className="plan-panel__score">
            <span>
              {progress?.completedCount ?? 0}/{progress?.itemCount ?? 0} done
            </span>
            <strong>
              {Math.round((progress?.progress ?? 0) * 100)}% of slot
            </strong>
          </div>
        </div>

        <form className="plan-add" onSubmit={submit}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              active === "1d"
                ? "Add a plan for today…"
                : "Add a plan item…"
            }
          />
          <button type="submit" className="btn btn--primary">
            Add
          </button>
        </form>

        <ul className="plan-list">
          {items.map((item) => {
            const checked =
              active === "1d"
                ? Boolean(state.today.planDone?.[item.id])
                : item.completed;
            return (
              <li key={item.id} className={`plan-item ${checked ? "plan-item--done" : ""}`}>
                <button
                  type="button"
                  className={`check ${checked ? "check--on" : ""}`}
                  onClick={() => {
                    if (active === "1d") {
                      onToggleDaily(item, !checked);
                    } else {
                      onToggleComplete(item, !checked);
                    }
                  }}
                  aria-pressed={checked}
                >
                  <span className="check__mark">{checked ? "✓" : ""}</span>
                </button>
                <input
                  className="plan-item__text"
                  defaultValue={item.text}
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (next && next !== item.text) onEditText(item, next);
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
              No plans yet. Add one above — writing it starts adding to today’s
              score.
            </li>
          )}
        </ul>
      </div>

      <div className="panel">
        <h2>How plans score</h2>
        <p className="plan-rules">
          Each horizon is one share of your daily total (same weight as a
          routine task). Writing at least one item unlocks 25%. Completing items
          fills the other 75% — so finishing 2 of 4 daily plans is half of that
          remaining share, even if you don’t finish every plan.
        </p>
      </div>
    </section>
  );
}
