import type {
  AppState,
  DayLog,
  DayStats,
  StreakInfo,
  Store,
  Task,
  TaskCompletion,
} from "./types";

export const STREAK_THRESHOLD = 70;

export function isTaskComplete(
  task: Task,
  completion?: TaskCompletion,
): boolean {
  if (!completion) return false;
  if (task.type === "count") {
    const target = task.target ?? 1;
    return (completion.count ?? 0) >= target;
  }
  return Boolean(completion.done);
}

export function activeTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => !t.hidden && !t.archived)
    .sort((a, b) => a.order - b.order);
}

export function computeDayStats(
  date: string,
  tasks: Task[],
  day: DayLog | undefined,
): DayStats {
  const active = activeTasks(tasks);
  const total = active.length;
  let completed = 0;
  for (const task of active) {
    if (isTaskComplete(task, day?.completions[task.id])) {
      completed += 1;
    }
  }
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return {
    date,
    completed,
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
  // Current streak: walk backwards from today while % >= threshold
  // Today counts only if it meets threshold (or we allow partial today?)
  // Rule: today counts if >= threshold; if today is below, streak can still
  // continue from yesterday (in-progress day).
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

  // Best streak across all dates in history
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
    // If not complete today, still count previous consecutive days
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
  const day = store.days[today] ?? {
    date: today,
    completions: {},
    mood: null,
  };

  const historyDates = new Set([
    ...Object.keys(store.days),
    today,
  ]);

  // Include last 60 days for calendar even if empty
  for (let i = 0; i < 60; i += 1) {
    historyDates.add(shiftDate(today, -i));
  }

  const historyByDate: Record<string, DayStats> = {};
  for (const date of historyDates) {
    historyByDate[date] = computeDayStats(date, store.tasks, store.days[date]);
  }

  const history = Object.values(historyByDate).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return {
    tasks: store.tasks.sort((a, b) => a.order - b.order),
    today: day,
    todayStats: historyByDate[today],
    history,
    streak: computeStreak(today, historyByDate),
    taskStreaks: computeTaskStreaks(today, store.tasks, store.days),
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
