import { promises as fs } from "fs";
import path from "path";
import { SEED_TASKS } from "./seed";
import type {
  DayLog,
  PlanHorizon,
  PlanItem,
  Store,
  Task,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

function emptyPlans(): Store["plans"] {
  return { "10y": [], "1y": [], "1m": [], "1d": [] };
}

function emptyDay(date: string): DayLog {
  return { date, completions: {}, planDone: {}, mood: null };
}

function defaultStore(): Store {
  return {
    tasks: structuredClone(SEED_TASKS),
    days: {},
    plans: emptyPlans(),
  };
}

function migrateStore(parsed: Store): { store: Store; changed: boolean } {
  let changed = false;

  if (!parsed.plans) {
    parsed.plans = emptyPlans();
    changed = true;
  }
  for (const key of ["10y", "1y", "1m", "1d"] as PlanHorizon[]) {
    if (!parsed.plans[key]) {
      parsed.plans[key] = [];
      changed = true;
    }
  }

  for (const day of Object.values(parsed.days)) {
    if (!day.planDone) {
      day.planDone = {};
      changed = true;
    }
  }

  for (const task of parsed.tasks) {
    if (task.id === "t03" || task.id === "t19") {
      if (!task.archived || !task.hidden) {
        task.archived = true;
        task.hidden = true;
        changed = true;
      }
    }
    if (task.id === "t12") {
      if (task.type !== "count" || task.target !== 3) {
        task.type = "count";
        task.target = 3;
        task.title = "Back exercises (3 sets)";
        changed = true;
      }
    }
    if (task.id === "t29" && task.type === "count" && task.target !== 2000) {
      task.target = 2000;
      changed = true;
    }
  }

  return { store: parsed, changed };
}

async function ensureStore(): Promise<Store> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Store;
    if (!parsed.tasks || !parsed.days) {
      throw new Error("Invalid store shape");
    }
    const { store, changed } = migrateStore(parsed);
    if (changed) {
      await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
    }
    return store;
  } catch {
    const store = defaultStore();
    await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
    return store;
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function readStore(): Promise<Store> {
  return ensureStore();
}

export async function getOrCreateDay(date: string): Promise<{
  store: Store;
  day: DayLog;
}> {
  const store = await ensureStore();
  if (!store.days[date]) {
    store.days[date] = emptyDay(date);
    await writeStore(store);
  } else if (!store.days[date].planDone) {
    store.days[date].planDone = {};
    await writeStore(store);
  }
  return { store, day: store.days[date] };
}

export async function updateDay(
  date: string,
  patch: Partial<Pick<DayLog, "completions" | "mood" | "planDone">>,
): Promise<DayLog> {
  const store = await ensureStore();
  const day = store.days[date] ?? emptyDay(date);
  if (!day.planDone) day.planDone = {};
  if (patch.completions) {
    day.completions = { ...day.completions, ...patch.completions };
  }
  if (patch.planDone) {
    day.planDone = { ...day.planDone, ...patch.planDone };
  }
  if (patch.mood !== undefined) {
    day.mood = patch.mood;
  }
  store.days[date] = day;
  await writeStore(store);
  return day;
}

export async function setTaskCompletion(
  date: string,
  taskId: string,
  completion: { done?: boolean; count?: number },
): Promise<DayLog> {
  const store = await ensureStore();
  const day = store.days[date] ?? emptyDay(date);
  if (!day.planDone) day.planDone = {};
  day.completions[taskId] = {
    ...day.completions[taskId],
    ...completion,
  };
  store.days[date] = day;
  await writeStore(store);
  return day;
}

export async function upsertTask(
  input: Partial<Task> & { title: string; group: Task["group"] },
): Promise<Task> {
  const store = await ensureStore();
  if (input.id) {
    const idx = store.tasks.findIndex((t) => t.id === input.id);
    if (idx === -1) throw new Error("Task not found");
    store.tasks[idx] = { ...store.tasks[idx], ...input, id: input.id };
    await writeStore(store);
    return store.tasks[idx];
  }

  const maxOrder = store.tasks.reduce((m, t) => Math.max(m, t.order), 0);
  const task: Task = {
    id: `t${Date.now().toString(36)}`,
    title: input.title,
    group: input.group,
    type: input.type ?? "check",
    target: input.target,
    order: input.order ?? maxOrder + 1,
    hidden: input.hidden ?? false,
    archived: input.archived ?? false,
  };
  store.tasks.push(task);
  await writeStore(store);
  return task;
}

export async function patchTask(
  id: string,
  patch: Partial<Omit<Task, "id">>,
): Promise<Task> {
  const store = await ensureStore();
  const idx = store.tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Task not found");
  store.tasks[idx] = { ...store.tasks[idx], ...patch };
  await writeStore(store);
  return store.tasks[idx];
}

export async function addPlanItem(
  horizon: PlanHorizon,
  text: string,
): Promise<PlanItem> {
  const store = await ensureStore();
  const item: PlanItem = {
    id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    text: text.trim(),
    horizon,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  store.plans[horizon].push(item);
  await writeStore(store);
  return item;
}

export async function patchPlanItem(
  id: string,
  patch: Partial<Pick<PlanItem, "text" | "completed">>,
): Promise<PlanItem> {
  const store = await ensureStore();
  for (const horizon of Object.keys(store.plans) as PlanHorizon[]) {
    const idx = store.plans[horizon].findIndex((p) => p.id === id);
    if (idx !== -1) {
      store.plans[horizon][idx] = {
        ...store.plans[horizon][idx],
        ...patch,
      };
      await writeStore(store);
      return store.plans[horizon][idx];
    }
  }
  throw new Error("Plan item not found");
}

export async function deletePlanItem(id: string): Promise<void> {
  const store = await ensureStore();
  for (const horizon of Object.keys(store.plans) as PlanHorizon[]) {
    const before = store.plans[horizon].length;
    store.plans[horizon] = store.plans[horizon].filter((p) => p.id !== id);
    if (store.plans[horizon].length !== before) {
      await writeStore(store);
      return;
    }
  }
  throw new Error("Plan item not found");
}

export async function setDailyPlanDone(
  date: string,
  itemId: string,
  done: boolean,
): Promise<DayLog> {
  return updateDay(date, { planDone: { [itemId]: done } });
}
