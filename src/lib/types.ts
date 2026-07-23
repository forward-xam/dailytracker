export type TaskType = "check" | "count";

export type TaskGroupId =
  | "morning"
  | "body"
  | "food"
  | "work"
  | "evening"
  | "close";

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

export interface DayLog {
  date: string;
  completions: Record<string, TaskCompletion>;
  mood: number | null;
}

export interface Store {
  tasks: Task[];
  days: Record<string, DayLog>;
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

export interface DayStats {
  date: string;
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

export interface AppState {
  tasks: Task[];
  today: DayLog;
  todayStats: DayStats;
  history: DayStats[];
  streak: StreakInfo;
  taskStreaks: Record<string, number>;
}
