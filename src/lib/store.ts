import { promises as fs } from "fs";
import path from "path";
import { SEED_TASKS } from "./seed";
import type { DayLog, Store, Task } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

function emptyDay(date: string): DayLog {
  return { date, completions: {}, mood: null };
}

function defaultStore(): Store {
  return {
    tasks: structuredClone(SEED_TASKS),
    days: {},
  };
}

async function ensureStore(): Promise<Store> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Store;
    if (!parsed.tasks || !parsed.days) {
      throw new Error("Invalid store shape");
    }
    let changed = false;
    for (const task of parsed.tasks) {
      if (
        task.id === "t29" &&
        task.type === "count" &&
        (task.target ?? 0) < 5000
      ) {
        task.target = 5000;
        changed = true;
      }
    }
    if (changed) {
      await fs.writeFile(STORE_PATH, JSON.stringify(parsed, null, 2), "utf8");
    }
    return parsed;
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
  }
  return { store, day: store.days[date] };
}

export async function updateDay(
  date: string,
  patch: Partial<Pick<DayLog, "completions" | "mood">>,
): Promise<DayLog> {
  const store = await ensureStore();
  const day = store.days[date] ?? emptyDay(date);
  if (patch.completions) {
    day.completions = { ...day.completions, ...patch.completions };
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

export async function reorderTasks(orderedIds: string[]): Promise<Task[]> {
  const store = await ensureStore();
  const map = new Map(store.tasks.map((t) => [t.id, t]));
  orderedIds.forEach((id, i) => {
    const task = map.get(id);
    if (task) task.order = i + 1;
  });
  store.tasks.sort((a, b) => a.order - b.order);
  await writeStore(store);
  return store.tasks;
}
