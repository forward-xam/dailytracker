export type TaskType = "check" | "count";

export type TaskGroupId =
  | "morning"
  | "body"
  | "food"
  | "work"
  | "evening"
  | "close";

export type PlanHorizon = "10y" | "1y" | "1m" | "1d";

export interface Task {
  id: string;
  title: string;
  group: TaskGroupId;
  type: TaskType;
  target?: number;
  order: number;
  hidden: boolean;
  archived: boolean;
}

export interface TaskCompletion {
  done?: boolean;
  count?: number;
}

/** One reusable affirmation statement under the main affirmations counter. */
export interface AffirmationItem {
  id: string;
  text: string;
  order: number;
  hidden: boolean;
}

export interface PlanItem {
  id: string;
  text: string;
  horizon: PlanHorizon;
  completed: boolean;
  /** YYYY-MM-DD when a long-term plan was marked complete */
  completedOn?: string | null;
  createdAt: string;
}

export type HistorySource = "daily-plan" | "plan" | "routine";

export interface HistoryEntry {
  id: string;
  title: string;
  completedOn: string;
  source: HistorySource;
  horizon?: PlanHorizon;
  taskId?: string;
}

export interface DayLog {
  date: string;
  completions: Record<string, TaskCompletion>;
  /** @deprecated Prefer item.completed on day.plans — kept for older 1d data */
  planDone: Record<string, boolean>;
  /** Plans written for this calendar day only (all horizons start empty each day) */
  plans: Record<PlanHorizon, PlanItem[]>;
  /** How you feel at the start of the day (1–10) */
  mood: number | null;
  /** How you feel at the end of the day (1–10) */
  moodEvening: number | null;
  /** Per-affirmation taps for this day (also add to the main affirmations total) */
  affirmationCounts: Record<string, number>;
}

export interface Store {
  tasks: Task[];
  days: Record<string, DayLog>;
  /**
   * Legacy global plans (pre per-day plans). Migrated into a DayLog on load.
   * Kept empty going forward.
   */
  plans: Record<PlanHorizon, PlanItem[]>;
  /** Affirmation statements under the main + counter */
  affirmations: AffirmationItem[];
  /** Archived completed daily plans (and other logged completions) */
  completedHistory: HistoryEntry[];
}

export interface GroupMeta {
  id: TaskGroupId;
  label: string;
}

export const GROUPS: GroupMeta[] = [
  { id: "morning", label: "Morning mind" },
  { id: "body", label: "Body" },
  { id: "food", label: "Food" },
  { id: "work", label: "Work & outreach" },
  { id: "evening", label: "Evening" },
  { id: "close", label: "Day close" },
];

export const PLAN_HORIZONS: { id: PlanHorizon; label: string; hint: string }[] =
  [
    {
      id: "10y",
      label: "10-year plans",
      hint: "Write today’s 10-year vision. Each new day starts this slot empty.",
    },
    {
      id: "1y",
      label: "1-year plans",
      hint: "Write today’s 1-year targets. Fresh list every morning.",
    },
    {
      id: "1m",
      label: "1-month plans",
      hint: "Write today’s month focus. Fresh list every morning.",
    },
    {
      id: "1d",
      label: "1-day plans",
      hint: "Today’s checklist. Tomorrow this slot starts empty again.",
    },
  ];

export function emptyPlanSlots(): Record<PlanHorizon, PlanItem[]> {
  return { "10y": [], "1y": [], "1m": [], "1d": [] };
}

/** Written plans give this share; completing items gives the rest. */
export const PLAN_WRITE_SHARE = 0.25;
export const PLAN_COMPLETE_SHARE = 0.75;

export interface DayStats {
  date: string;
  /** Fractional progress sum (e.g. 12.4) */
  completed: number;
  total: number;
  percent: number;
  /** Morning mood 1–10 */
  mood: number | null;
  /** Evening mood 1–10 */
  moodEvening: number | null;
}

export interface StreakInfo {
  current: number;
  best: number;
  threshold: number;
}

export interface PlanHorizonProgress {
  horizon: PlanHorizon;
  itemCount: number;
  completedCount: number;
  progress: number;
}

/** Totals for one routine task over a period (all-time or a calendar year). */
export interface TaskPeriodStats {
  id: string;
  title: string;
  type: TaskType;
  /** Days the task was fully completed in the period */
  daysCompleted: number;
  /** Days in the period that have any logged activity */
  daysLogged: number;
  /** Current consecutive-day streak (only meaningful for all-time / current year) */
  streak: number;
  /** Sum of counts for count-type tasks (e.g. total affirmations) */
  totalCount: number;
  /** Average count on days with any count > 0 */
  avgCount: number;
  target?: number;
}

/** One selectable stats period: all recorded time, or a single year. */
export interface TaskStatsPeriod {
  /** `"all"` or a calendar year like `"2026"` */
  key: string;
  label: string;
  year: number | null;
  daysLogged: number;
  tasks: TaskPeriodStats[];
}

export interface AppState {
  tasks: Task[];
  today: DayLog;
  todayStats: DayStats;
  history: DayStats[];
  streak: StreakInfo;
  taskStreaks: Record<string, number>;
  /** All-time + each calendar year with logged days */
  taskPeriods: TaskStatsPeriod[];
  plans: Record<PlanHorizon, PlanItem[]>;
  planProgress: PlanHorizonProgress[];
  affirmations: AffirmationItem[];
  /** Newest first — completed daily plans, long-term plans, and routines */
  completedLog: HistoryEntry[];
}
