import type {
  AppState,
  DayLog,
  DayStats,
  PlanHorizon,
  PlanHorizonProgress,
  PlanItem,
  StreakInfo,
  Store,
  Task,
  TaskCompletion,
} from "./types";
import {
  PLAN_COMPLETE_SHARE,
  PLAN_HORIZONS,
  PLAN_WRITE_SHARE,
} from "./types";

export const STREAK_THRESHOLD = 70;

export function taskProgress(
  task: Task,
  completion?: TaskCompletion,
): number {
  if (!completion) return 0;
  if (task.type === "count") {
    const target = task.target ?? 1;
    if (target <= 0) return 0;
    return Math.min(1, Math.max(0, (completion.count ?? 0) / target));
  }
  return completion.done ? 1 : 0;
}

export function isTaskComplete(
  task: Task,
  completion?: TaskCompletion,
): boolean {
  return taskProgress(task, completion) >= 1;
}

export function activeTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => !t.hidden && !t.archived)
    .sort((a, b) => a.order - b.order);
}

export function planHorizonProgress(
  horizon: PlanHorizon,
  items: PlanItem[],
  day: DayLog | undefined,
): PlanHorizonProgress {
  const itemCount = items.length;
  if (itemCount === 0) {
    return {
      horizon,
      itemCount: 0,
      completedCount: 0,
      progress: 0,
    };
  }

  let completedCount = 0;
  if (horizon === "1d") {
    completedCount = items.filter((item) => day?.planDone?.[item.id]).length;
  } else {
    completedCount = items.filter((item) => item.completed).length;
  }

  const progress =
    PLAN_WRITE_SHARE + PLAN_COMPLETE_SHARE * (completedCount / itemCount);

  return {
    horizon,
    itemCount,
    completedCount,
    progress: Math.min(1, progress),
  };
}

export function computeDayStats(
  date: string,
  tasks: Task[],
  day: DayLog | undefined,
  plans: Store["plans"],
): DayStats {
  const active = activeTasks(tasks);
  let earned = 0;
  for (const task of active) {
    earned += taskProgress(task, day?.completions[task.id]);
  }

  for (const meta of PLAN_HORIZONS) {
    earned += planHorizonProgress(meta.id, plans[meta.id] ?? [], day).progress;
  }

  const total = active.length + PLAN_HORIZONS.length;
  const percent = total === 0 ? 0 : Math.round((earned / total) * 100);
  return {
    date,
    completed: Math.round(earned * 10) / 10,
    total,
    percent,
    mood: day?.mood ?? null,
  };
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function computeStreak(
  today: string,
  historyByDate: Record<string, DayStats>,
  threshold = STREAK_THRESHOLD,
): StreakInfo {
  let current = 0;
  let cursor = today;
  const todayStats = historyByDate[today];
  if (todayStats && todayStats.percent >= threshold) {
    current = 1;
    cursor = shiftDate(today, -1);
  } else {
    cursor = shiftDate(today, -1);
  }

  while (true) {
    const stats = historyByDate[cursor];
    if (!stats || stats.percent < threshold) break;
    current += 1;
    cursor = shiftDate(cursor, -1);
  }

  const dates = Object.keys(historyByDate).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of dates) {
    const stats = historyByDate[date];
    if (stats.percent < threshold) {
      run = 0;
      prev = date;
      continue;
    }
    if (prev && shiftDate(prev, 1) === date) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = date;
  }
  best = Math.max(best, current);

  return { current, best, threshold };
}

export function computeTaskStreaks(
  today: string,
  tasks: Task[],
  days: Record<string, DayLog>,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const task of activeTasks(tasks)) {
    let streak = 0;
    let cursor = today;
    if (!isTaskComplete(task, days[cursor]?.completions[task.id])) {
      cursor = shiftDate(cursor, -1);
    }
    while (true) {
      const day = days[cursor];
      if (!day || !isTaskComplete(task, day.completions[task.id])) break;
      streak += 1;
      cursor = shiftDate(cursor, -1);
    }
    result[task.id] = streak;
  }
  return result;
}

export function buildAppState(store: Store, today: string): AppState {
  const plans = store.plans ?? {
    "10y": [],
    "1y": [],
    "1m": [],
    "1d": [],
  };

  const day = store.days[today] ?? {
    date: today,
    completions: {},
    planDone: {},
    mood: null,
  };
  if (!day.planDone) day.planDone = {};

  const historyDates = new Set([...Object.keys(store.days), today]);

  for (let i = 0; i < 60; i += 1) {
    historyDates.add(shiftDate(today, -i));
  }

  const historyByDate: Record<string, DayStats> = {};
  for (const date of historyDates) {
    historyByDate[date] = computeDayStats(
      date,
      store.tasks,
      store.days[date],
      plans,
    );
  }

  const history = Object.values(historyByDate).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const planProgress = PLAN_HORIZONS.map((meta) =>
    planHorizonProgress(meta.id, plans[meta.id] ?? [], day),
  );

  return {
    tasks: store.tasks.sort((a, b) => a.order - b.order),
    today: day,
    todayStats: historyByDate[today],
    history,
    streak: computeStreak(today, historyByDate),
    taskStreaks: computeTaskStreaks(today, store.tasks, store.days),
    plans,
    planProgress,
  };
}

export function localToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
