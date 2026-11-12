import type {
  AppState,
  DayLog,
  DayStats,
  HistoryEntry,
  PlanHorizon,
  PlanHorizonProgress,
  PlanItem,
  StreakInfo,
  Store,
  Task,
  TaskCompletion,
  TaskPeriodStats,
  TaskStatsPeriod,
} from "./types";
import {
  PLAN_COMPLETE_SHARE,
  PLAN_HORIZONS,
  PLAN_WRITE_SHARE,
  emptyPlanSlots,
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

  const completedCount = items.filter(
    (item) => item.completed || Boolean(day?.planDone?.[item.id]),
  ).length;

  const progress =
    PLAN_WRITE_SHARE + PLAN_COMPLETE_SHARE * (completedCount / itemCount);

  return {
    horizon,
    itemCount,
    completedCount,
    progress: Math.min(1, progress),
  };
}

function plansForDate(
  date: string,
  horizon: PlanHorizon,
  store: Store,
): PlanItem[] {
  const dayPlans = store.days[date]?.plans?.[horizon];
  if (dayPlans) return dayPlans;

  // Legacy fallback while old global plans still exist pre-migration.
  return store.plans?.[horizon] ?? [];
}

export function computeDayStats(
  date: string,
  tasks: Task[],
  day: DayLog | undefined,
  store: Store,
): DayStats {
  const active = activeTasks(tasks);
  let earned = 0;
  for (const task of active) {
    earned += taskProgress(task, day?.completions[task.id]);
  }

  for (const meta of PLAN_HORIZONS) {
    const items = plansForDate(date, meta.id, store);
    earned += planHorizonProgress(meta.id, items, day).progress;
  }

  const total = active.length + PLAN_HORIZONS.length;
  const percent = total === 0 ? 0 : Math.round((earned / total) * 100);
  return {
    date,
    completed: Math.round(earned * 10) / 10,
    total,
    percent,
    mood: day?.mood ?? null,
    moodEvening: day?.moodEvening ?? null,
  };
}

export function buildCompletedLog(
  store: Store,
  _today: string,
): HistoryEntry[] {
  const entries: HistoryEntry[] = [...(store.completedHistory ?? [])];

  const taskMap = new Map(store.tasks.map((t) => [t.id, t]));
  for (const [date, day] of Object.entries(store.days)) {
    for (const [taskId, completion] of Object.entries(day.completions ?? {})) {
      const task = taskMap.get(taskId);
      if (!task || task.hidden || task.archived) continue;
      if (!isTaskComplete(task, completion)) continue;
      entries.push({
        id: `routine-${date}-${taskId}`,
        title: task.title,
        completedOn: date,
        source: "routine",
        taskId,
      });
    }

    for (const meta of PLAN_HORIZONS) {
      for (const item of day.plans?.[meta.id] ?? []) {
        const done =
          item.completed || Boolean(day.planDone?.[item.id]);
        if (!done) continue;
        entries.push({
          id: `plan-day-${item.id}-${date}`,
          title: item.text,
          completedOn: item.completedOn ?? date,
          source: meta.id === "1d" ? "daily-plan" : "plan",
          horizon: meta.id,
          taskId: item.id,
        });
      }
    }
  }

  const seen = new Set<string>();
  return entries
    .filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    })
    .sort((a, b) => {
      const byDate = b.completedOn.localeCompare(a.completedOn);
      if (byDate !== 0) return byDate;
      return a.title.localeCompare(b.title);
    });
}

export function shiftDate(date: string, days: number): string {
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

function dayHasActivity(day: DayLog): boolean {
  if (day.mood != null || day.moodEvening != null) return true;
  const completions = day.completions ?? {};
  for (const value of Object.values(completions)) {
    if (value?.done) return true;
    if ((value?.count ?? 0) > 0) return true;
  }
  const planDone = day.planDone ?? {};
  if (Object.values(planDone).some(Boolean)) return true;
  for (const meta of PLAN_HORIZONS) {
    if ((day.plans?.[meta.id] ?? []).length > 0) return true;
  }
  return false;
}

function aggregateTaskPeriod(
  tasks: Task[],
  dayList: DayLog[],
  streaks: Record<string, number>,
  includeStreak: boolean,
): TaskPeriodStats[] {
  const daysLogged = dayList.filter(dayHasActivity).length;

  return [...tasks]
    .filter((t) => !t.archived)
    .sort((a, b) => a.order - b.order)
    .map((task) => {
      let daysCompleted = 0;
      let totalCount = 0;
      let daysWithCount = 0;
      for (const day of dayList) {
        const completion = day.completions?.[task.id];
        if (!completion) continue;
        if (task.type === "count") {
          const count = completion.count ?? 0;
          if (count > 0) {
            totalCount += count;
            daysWithCount += 1;
          }
        }
        if (isTaskComplete(task, completion)) {
          daysCompleted += 1;
        }
      }
      const avgCount =
        daysWithCount > 0
          ? Math.round((totalCount / daysWithCount) * 10) / 10
          : 0;
      return {
        id: task.id,
        title: task.title,
        type: task.type,
        daysCompleted,
        daysLogged,
        streak: includeStreak ? (streaks[task.id] ?? 0) : 0,
        totalCount,
        avgCount,
        target: task.target,
      };
    })
    .filter((t) => t.daysCompleted > 0 || t.totalCount > 0 || t.streak > 0)
    .sort((a, b) => {
      if (b.daysCompleted !== a.daysCompleted) {
        return b.daysCompleted - a.daysCompleted;
      }
      return b.totalCount - a.totalCount;
    });
}

export function computeTaskPeriods(
  tasks: Task[],
  days: Record<string, DayLog>,
  streaks: Record<string, number>,
  today: string,
): TaskStatsPeriod[] {
  const dayList = Object.values(days).filter((d) => d.date <= today);
  const years = [
    ...new Set(dayList.map((d) => Number(d.date.slice(0, 4)))),
  ].sort((a, b) => b - a);

  const currentYear = Number(today.slice(0, 4));
  const periods: TaskStatsPeriod[] = [
    {
      key: "all",
      label: "All time",
      year: null,
      daysLogged: dayList.filter(dayHasActivity).length,
      tasks: aggregateTaskPeriod(tasks, dayList, streaks, true),
    },
  ];

  for (const year of years) {
    const yearDays = dayList.filter((d) => d.date.startsWith(String(year)));
    periods.push({
      key: String(year),
      label: String(year),
      year,
      daysLogged: yearDays.filter(dayHasActivity).length,
      tasks: aggregateTaskPeriod(
        tasks,
        yearDays,
        streaks,
        year === currentYear,
      ),
    });
  }

  return periods;
}

export function buildAppState(
  store: Store,
  calendarToday: string,
  viewDate = calendarToday,
): AppState {
  const day = store.days[viewDate] ?? {
    date: viewDate,
    completions: {},
    planDone: {},
    plans: emptyPlanSlots(),
    mood: null,
    moodEvening: null,
    affirmationCounts: {},
  };
  if (!day.planDone) day.planDone = {};
  if (day.moodEvening === undefined) day.moodEvening = null;
  if (!day.affirmationCounts) day.affirmationCounts = {};
  if (!day.plans) day.plans = emptyPlanSlots();
  for (const meta of PLAN_HORIZONS) {
    if (!day.plans[meta.id]) day.plans[meta.id] = [];
  }

  const viewPlans = day.plans;

  const historyDates = new Set([
    ...Object.keys(store.days),
    calendarToday,
    viewDate,
  ]);

  // Fill every day from the earliest recorded activity through calendar today
  const earliest = [...historyDates].sort()[0] ?? calendarToday;
  let cursor = earliest;
  while (cursor <= calendarToday) {
    historyDates.add(cursor);
    cursor = shiftDate(cursor, 1);
  }

  const historyByDate: Record<string, DayStats> = {};
  for (const date of historyDates) {
    historyByDate[date] = computeDayStats(
      date,
      store.tasks,
      store.days[date],
      store,
    );
  }

  const history = Object.values(historyByDate)
    .filter((h) => h.date <= calendarToday)
    .sort((a, b) => a.date.localeCompare(b.date));

  const planProgress = PLAN_HORIZONS.map((meta) =>
    planHorizonProgress(
      meta.id,
      plansForDate(viewDate, meta.id, store),
      day,
    ),
  );

  const taskStreaks = computeTaskStreaks(
    calendarToday,
    store.tasks,
    store.days,
  );

  return {
    tasks: store.tasks.sort((a, b) => a.order - b.order),
    today: day,
    todayStats:
      historyByDate[viewDate] ??
      computeDayStats(viewDate, store.tasks, day, store),
    history,
    streak: computeStreak(calendarToday, historyByDate),
    taskStreaks,
    taskPeriods: computeTaskPeriods(
      store.tasks,
      store.days,
      taskStreaks,
      calendarToday,
    ),
    plans: viewPlans,
    planProgress,
    affirmations: [...(store.affirmations ?? [])].sort(
      (a, b) => a.order - b.order,
    ),
    completedLog: buildCompletedLog(store, calendarToday),
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
