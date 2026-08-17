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
  /** Daily-plan item ids marked done on this date */
  planDone: Record<string, boolean>;
  mood: number | null;
}

export interface Store {
  tasks: Task[];
  days: Record<string, DayLog>;
  plans: Record<PlanHorizon, PlanItem[]>;
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
      hint: "Big life direction. Writing it boosts today’s %.",
    },
    {
      id: "1y",
      label: "1-year plans",
      hint: "This year’s targets. Mark items as you finish them.",
    },
    {
      id: "1m",
      label: "1-month plans",
      hint: "This month’s focus.",
    },
    {
      id: "1d",
      label: "1-day plans",
      hint: "Today’s checklist. Finished items leave this list tomorrow and move to Completed.",
    },
  ];

/** Written plans give this share; completing items gives the rest. */
export const PLAN_WRITE_SHARE = 0.25;
export const PLAN_COMPLETE_SHARE = 0.75;

export interface DayStats {
  date: string;
  /** Fractional progress sum (e.g. 12.4) */
  completed: number;
  total: number;
  percent: number;
  mood: number | null;
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

export interface AppState {
  tasks: Task[];
  today: DayLog;
  todayStats: DayStats;
  history: DayStats[];
  streak: StreakInfo;
  taskStreaks: Record<string, number>;
  plans: Record<PlanHorizon, PlanItem[]>;
  planProgress: PlanHorizonProgress[];
  /** Newest first — completed daily plans, long-term plans, and routines */
  completedLog: HistoryEntry[];
}
