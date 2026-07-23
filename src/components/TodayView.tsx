"use client";

import { useMemo, useState } from "react";
import { ProgressRing } from "@/components/ProgressRing";
import { TaskRow } from "@/components/TaskRow";
import { GROUPS } from "@/lib/types";
import type { AppState, Task } from "@/lib/types";
import { formatDisplayDate } from "@/lib/stats";

interface TodayViewProps {
  state: AppState;
  date: string;
  busy: boolean;
  onToggle: (task: Task) => void;
  onCount: (task: Task, delta: number) => void;
  onMood: (mood: number | null) => void;
}

export function TodayView({
  state,
  date,
  busy,
  onToggle,
  onCount,
  onMood,
}: TodayViewProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const active = useMemo(
    () =>
      state.tasks
        .filter((t) => !t.hidden && !t.archived)
        .sort((a, b) => a.order - b.order),
    [state.tasks],
  );

  const byGroup = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const g of GROUPS) map.set(g.id, []);
    for (const task of active) {
      const list = map.get(task.group) ?? [];
      list.push(task);
      map.set(task.group, list);
    }
    return map;
  }, [active]);

  return (
    <section className={`today ${busy ? "is-busy" : ""}`}>
      <header className="today__hero">
        <p className="brand">Day Mark</p>
        <h1 className="today__date">{formatDisplayDate(date)}</h1>
        <p className="today__support">
          Mark what you did. Build the streak. Beat the spreadsheet.
        </p>

        <div className="today__score">
          <ProgressRing percent={state.todayStats.percent} />
          <div className="today__side">
            <div className="stat-block">
              <span className="stat-block__label">Done</span>
              <span className="stat-block__value">
                {state.todayStats.completed}/{state.todayStats.total}
              </span>
            </div>
            <div className="stat-block">
              <span className="stat-block__label">Streak</span>
              <span className="stat-block__value accent">
                {state.streak.current}
                <span className="stat-block__unit"> days</span>
              </span>
            </div>
            <div className="stat-block">
              <span className="stat-block__label">Best</span>
              <span className="stat-block__value">{state.streak.best}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mood-panel">
        <div className="mood-panel__head">
          <span>How do you feel?</span>
          <strong>{state.today.mood ? `${state.today.mood}/10` : "—"}</strong>
        </div>
        <div className="mood-scale">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={`mood-btn ${state.today.mood === n ? "mood-btn--on" : ""}`}
              onClick={() => onMood(state.today.mood === n ? null : n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {GROUPS.map((group) => {
        const tasks = byGroup.get(group.id) ?? [];
        if (tasks.length === 0) return null;
        const isCollapsed = collapsed[group.id];
        const doneCount = tasks.filter((t) => {
          const c = state.today.completions[t.id];
          if (t.type === "count") return (c?.count ?? 0) >= (t.target ?? 1);
          return Boolean(c?.done);
        }).length;

        return (
          <div key={group.id} className="group">
            <button
              type="button"
              className="group__head"
              onClick={() =>
                setCollapsed((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
              }
            >
              <span>{group.label}</span>
              <span className="group__count">
                {doneCount}/{tasks.length}
                <span className="group__chev">{isCollapsed ? "+" : "−"}</span>
              </span>
            </button>
            {!isCollapsed && (
              <div className="group__list">
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    completion={state.today.completions[task.id]}
                    streak={state.taskStreaks[task.id]}
                    onToggle={onToggle}
                    onCount={onCount}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
