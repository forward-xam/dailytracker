"use client";

import { useEffect, useState } from "react";
import { HistoryView } from "@/components/HistoryView";
import { StatsView } from "@/components/StatsView";
import { TasksView } from "@/components/TasksView";
import { TodayView } from "@/components/TodayView";
import {
  addAffirmationLocal,
  addPlanLocal,
  bumpAffirmationItem,
  deleteAffirmationLocal,
  deletePlanLocal,
  getState,
  initClientDb,
  patchAffirmationLocal,
  patchPlanLocal,
  patchTaskLocal,
  setDailyPlanDoneLocal,
  setMood,
  setTaskCompletion,
  shareUrl,
  upsertTaskLocal,
} from "@/lib/client-db";
import { shiftDate } from "@/lib/stats";
import type {
  AppState,
  PlanHorizon,
  PlanItem,
  Task,
  TaskGroupId,
  TaskType,
} from "@/lib/types";

type Tab = "today" | "history" | "stats" | "tasks";

/** How far back users can edit missed days. */
const MAX_LOOKBACK_DAYS = 60;

function clientToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function AppShell() {
  const [tab, setTab] = useState<Tab>("today");
  const [today] = useState(clientToday);
  const [viewDate, setViewDate] = useState(today);
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState("");
  const [copied, setCopied] = useState(false);

  const earliestDate = shiftDate(today, -MAX_LOOKBACK_DAYS);

  useEffect(() => {
    let cancelled = false;
    initClientDb()
      .then((result) => {
        if (cancelled) return;
        setShare(result.share || shareUrl(result.syncId));
        setState(getState(today, viewDate));
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your tracker.");
      });
    return () => {
      cancelled = true;
    };
    // Initial load only — day changes refresh via setViewDate handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

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

  function goToDate(next: string) {
    if (next > today || next < earliestDate) return;
    setViewDate(next);
    setState(getState(today, next));
  }

  function onToggle(task: Task) {
    const current = state?.today.completions[task.id]?.done ?? false;
    run(() => setTaskCompletion(viewDate, task.id, { done: !current }));
  }

  function onCount(task: Task, delta: number) {
    const current = state?.today.completions[task.id]?.count ?? 0;
    const max = task.target ?? Number.POSITIVE_INFINITY;
    const next = Math.min(max, Math.max(0, current + delta));
    run(() => setTaskCompletion(viewDate, task.id, { count: next }));
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
            date={viewDate}
            today={today}
            canGoBack={viewDate > earliestDate}
            canGoForward={viewDate < today}
            busy={busy}
            onPrevDay={() => goToDate(shiftDate(viewDate, -1))}
            onNextDay={() => goToDate(shiftDate(viewDate, 1))}
            onGoToday={() => goToDate(today)}
            onToggle={onToggle}
            onCount={onCount}
            onAffirmationBump={(id, delta) =>
              run(() => bumpAffirmationItem(viewDate, id, delta))
            }
            onAffirmationAdd={(text) => run(() => addAffirmationLocal(text))}
            onAffirmationHide={(id, hidden) =>
              run(() => patchAffirmationLocal(id, { hidden }))
            }
            onAffirmationDelete={(id) =>
              run(() => deleteAffirmationLocal(id))
            }
            onMood={(mood, slot = "morning") =>
              run(() => setMood(viewDate, mood, slot))
            }
            onAddPlan={(horizon: PlanHorizon, text: string) =>
              run(() => addPlanLocal(viewDate, horizon, text))
            }
            onTogglePlanComplete={(item: PlanItem, completed: boolean) =>
              run(() => patchPlanLocal(viewDate, item.id, { completed }))
            }
            onTogglePlanDaily={(item: PlanItem, done: boolean) =>
              run(() => setDailyPlanDoneLocal(viewDate, item.id, done))
            }
            onDeletePlan={(item: PlanItem) =>
              run(() => deletePlanLocal(viewDate, item.id))
            }
            onEditPlanText={(item: PlanItem, text: string) =>
              run(() => patchPlanLocal(viewDate, item.id, { text }))
            }
          />
        )}
        {tab === "history" && <HistoryView state={state} />}
        {tab === "stats" && <StatsView state={state} today={today} />}
        {tab === "tasks" && (
          <TasksView
            state={state}
            busy={busy}
            onPatch={(id, patch) =>
              run(() => patchTaskLocal(viewDate, id, patch))
            }
            onCreate={(input: {
              title: string;
              group: TaskGroupId;
              type: TaskType;
              target?: number;
            }) => run(() => upsertTaskLocal(viewDate, input))}
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
