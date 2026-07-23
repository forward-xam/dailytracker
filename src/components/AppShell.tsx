"use client";

import { useEffect, useState } from "react";
import { StatsView } from "@/components/StatsView";
import { TasksView } from "@/components/TasksView";
import { TodayView } from "@/components/TodayView";
import type { AppState, Task, TaskGroupId, TaskType } from "@/lib/types";

type Tab = "today" | "stats" | "tasks";

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

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/state?date=${date}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json() as Promise<AppState>;
      })
      .then((data) => {
        setState(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Could not load your tracker. Refresh and try again.");
      });

    return () => controller.abort();
  }, [date]);

  async function mutateDay(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/day", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, ...body }),
      });
      if (!res.ok) throw new Error("Update failed");
      setState(await res.json());
    } catch {
      setError("Could not save. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function mutateTask(body: Record<string, unknown>, method: "POST" | "PATCH") {
    setBusy(true);
    try {
      const res = await fetch("/api/tasks", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, ...body }),
      });
      if (!res.ok) throw new Error("Task update failed");
      setState(await res.json());
    } catch {
      setError("Could not update tasks.");
    } finally {
      setBusy(false);
    }
  }

  function onToggle(task: Task) {
    const current = state?.today.completions[task.id]?.done ?? false;
    void mutateDay({ taskId: task.id, done: !current });
  }

  function onCount(task: Task, delta: number) {
    const current = state?.today.completions[task.id]?.count ?? 0;
    const max = task.target ?? Number.POSITIVE_INFINITY;
    const next = Math.min(max, Math.max(0, current + delta));
    void mutateDay({ taskId: task.id, count: next });
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

        {tab === "today" && (
          <TodayView
            state={state}
            date={date}
            busy={busy}
            onToggle={onToggle}
            onCount={onCount}
            onMood={(mood) => void mutateDay({ mood })}
          />
        )}
        {tab === "stats" && <StatsView state={state} today={date} />}
        {tab === "tasks" && (
          <TasksView
            state={state}
            busy={busy}
            onPatch={(id, patch) => void mutateTask({ id, ...patch }, "PATCH")}
            onCreate={(input: {
              title: string;
              group: TaskGroupId;
              type: TaskType;
              target?: number;
            }) => void mutateTask(input, "POST")}
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
