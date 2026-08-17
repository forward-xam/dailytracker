"use client";

import { useEffect, useState } from "react";
import { HistoryView } from "@/components/HistoryView";
import { StatsView } from "@/components/StatsView";
import { TasksView } from "@/components/TasksView";
import { TodayView } from "@/components/TodayView";
import {
  addPlanLocal,
  deletePlanLocal,
  getState,
  initClientDb,
  patchPlanLocal,
  patchTaskLocal,
  setDailyPlanDoneLocal,
  setMood,
  setTaskCompletion,
  shareUrl,
  upsertTaskLocal,
} from "@/lib/client-db";
import type {
  AppState,
  PlanHorizon,
  PlanItem,
  Task,
  TaskGroupId,
  TaskType,
} from "@/lib/types";

type Tab = "today" | "history" | "stats" | "tasks";

function clientToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function AppShell() {
  const [tab, setTab] = useState<Tab>("today");
  const [date] = useState(clientToday);
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    initClientDb()
      .then((result) => {
        if (cancelled) return;
        setShare(result.share || shareUrl(result.syncId));
        setState(getState(date));
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your tracker.");
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  function run(updater: () => AppState) {
    setBusy(true);
    try {
      setState(updater());
      setError(null);
    } catch {
      setError("Could not save.");
    } finally {
      setBusy(false);
    }
  }

  function onToggle(task: Task) {
    const current = state?.today.completions[task.id]?.done ?? false;
    run(() => setTaskCompletion(date, task.id, { done: !current }));
  }

  function onCount(task: Task, delta: number) {
    const current = state?.today.completions[task.id]?.count ?? 0;
    const max = task.target ?? Number.POSITIVE_INFINITY;
    const next = Math.min(max, Math.max(0, current + delta));
    run(() => setTaskCompletion(date, task.id, { count: next }));
  }

  async function copyLink() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link.");
    }
  }

  if (!state) {
    return (
      <div className="boot">
        <p className="brand">Day Mark</p>
        <p className="boot__text">{error ?? "Loading your day…"}</p>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="shell__glow" aria-hidden />
      <main className="shell__main">
        {error && (
          <div className="banner" role="status">
            {error}
            <button type="button" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div className="sync-bar">
          <span>Use this same link on phone and laptop — your marks stay synced.</span>
          <button type="button" className="btn btn--primary" onClick={() => void copyLink()}>
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>

        {tab === "today" && (
          <TodayView
            state={state}
            date={date}
            busy={busy}
            onToggle={onToggle}
            onCount={onCount}
            onMood={(mood) => run(() => setMood(date, mood))}
            onAddPlan={(horizon: PlanHorizon, text: string) =>
              run(() => addPlanLocal(date, horizon, text))
            }
            onTogglePlanComplete={(item: PlanItem, completed: boolean) =>
              run(() => patchPlanLocal(date, item.id, { completed }))
            }
            onTogglePlanDaily={(item: PlanItem, done: boolean) =>
              run(() => setDailyPlanDoneLocal(date, item.id, done))
            }
            onDeletePlan={(item: PlanItem) =>
              run(() => deletePlanLocal(date, item.id))
            }
            onEditPlanText={(item: PlanItem, text: string) =>
              run(() => patchPlanLocal(date, item.id, { text }))
            }
          />
        )}
        {tab === "history" && <HistoryView state={state} />}
        {tab === "stats" && <StatsView state={state} today={date} />}
        {tab === "tasks" && (
          <TasksView
            state={state}
            busy={busy}
            onPatch={(id, patch) =>
              run(() => patchTaskLocal(date, id, patch))
            }
            onCreate={(input: {
              title: string;
              group: TaskGroupId;
              type: TaskType;
              target?: number;
            }) => run(() => upsertTaskLocal(date, input))}
          />
        )}
      </main>

      <nav className="tabbar" aria-label="Primary">
        <button
          type="button"
          className={tab === "today" ? "tab tab--on" : "tab"}
          onClick={() => setTab("today")}
        >
          Today
        </button>
        <button
          type="button"
          className={tab === "history" ? "tab tab--on" : "tab"}
          onClick={() => setTab("history")}
        >
          Done
        </button>
        <button
          type="button"
          className={tab === "stats" ? "tab tab--on" : "tab"}
          onClick={() => setTab("stats")}
        >
          Stats
        </button>
        <button
          type="button"
          className={tab === "tasks" ? "tab tab--on" : "tab"}
          onClick={() => setTab("tasks")}
        >
          Edit
        </button>
      </nav>
    </div>
  );
}
