import { seedAffirmations } from "./affirmations-seed";
import { SEED_TASKS } from "./seed";
import { buildAppState, localToday } from "./stats";
import type {
  AffirmationItem,
  AppState,
  DayLog,
  HistoryEntry,
  PlanHorizon,
  PlanItem,
  Store,
  Task,
} from "./types";
import { emptyPlanSlots, PLAN_HORIZONS } from "./types";

export const AFFIRMATION_TASK_ID = "t29";

/** Calendar “today” used for streaks/history; view date is the day being edited. */
let calendarAnchor = "";
let viewAnchor = "";

const LOCAL_KEY = "daymark-store-v1";
const SYNC_KEY = "daymark-sync-id";
const META_KEY = "daymark-meta-v1";
const KV_APP = "e3oi1v26";
const KV_BASE = "https://keyvalue.immanuel.co/api/KeyVal";
const CHUNK = 800;

type Meta = { updatedAt: number };

function emptyPlans(): Store["plans"] {
  return emptyPlanSlots();
}

function ensureDayPlans(day: DayLog): Record<PlanHorizon, PlanItem[]> {
  if (!day.plans) day.plans = emptyPlanSlots();
  for (const meta of PLAN_HORIZONS) {
    if (!day.plans[meta.id]) day.plans[meta.id] = [];
  }
  return day.plans;
}

function emptyDay(date: string): DayLog {
  return {
    date,
    completions: {},
    planDone: {},
    plans: emptyPlanSlots(),
    mood: null,
    moodEvening: null,
    affirmationCounts: {},
  };
}

export function defaultStore(): Store {
  return {
    tasks: structuredClone(SEED_TASKS),
    days: {},
    plans: emptyPlans(),
    affirmations: seedAffirmations(),
    completedHistory: [],
  };
}

function hasAnyPlans(plans: Record<PlanHorizon, PlanItem[]> | undefined): boolean {
  if (!plans) return false;
  return PLAN_HORIZONS.some((meta) => (plans[meta.id] ?? []).length > 0);
}

/** Move legacy global plans onto the newest existing day (not onto a fresh today). */
function migrateLegacyGlobalPlans(parsed: Store, calendarToday: string): void {
  if (!hasAnyPlans(parsed.plans)) {
    parsed.plans = emptyPlans();
    return;
  }

  const dayAlreadyHasPlans = Object.values(parsed.days ?? {}).some((day) =>
    hasAnyPlans(day.plans),
  );
  if (dayAlreadyHasPlans) {
    parsed.plans = emptyPlans();
    return;
  }

  const dates = Object.keys(parsed.days ?? {}).sort();
  let target = dates.filter((d) => d <= calendarToday).at(-1) ?? null;
  if (!target) {
    // Prefer parking legacy plans on yesterday so a brand-new today stays empty.
    const y = new Date(`${calendarToday}T12:00:00`);
    y.setDate(y.getDate() - 1);
    target = y.toISOString().slice(0, 10);
  }

  if (!parsed.days[target]) {
    parsed.days[target] = emptyDay(target);
  }
  ensureDayPlans(parsed.days[target]);
  for (const meta of PLAN_HORIZONS) {
    parsed.days[target].plans[meta.id] = structuredClone(
      parsed.plans[meta.id] ?? [],
    );
  }
  // Mirror old 1d planDone completion onto item.completed for that day.
  const planDone = parsed.days[target].planDone ?? {};
  for (const item of parsed.days[target].plans["1d"]) {
    if (planDone[item.id]) {
      item.completed = true;
      item.completedOn = item.completedOn ?? target;
    }
  }
  parsed.plans = emptyPlans();
}

export function migrateStore(
  parsed: Store,
  calendarToday = localToday(),
): Store {
  if (!parsed.plans) parsed.plans = emptyPlans();
  for (const key of ["10y", "1y", "1m", "1d"] as PlanHorizon[]) {
    if (!parsed.plans[key]) parsed.plans[key] = [];
  }
  if (!parsed.completedHistory) parsed.completedHistory = [];
  if (!parsed.days) parsed.days = {};
  for (const day of Object.values(parsed.days)) {
    if (!day.planDone) day.planDone = {};
    if (day.moodEvening === undefined) day.moodEvening = null;
    if (!day.affirmationCounts) day.affirmationCounts = {};
    ensureDayPlans(day);
  }
  if (!parsed.tasks) parsed.tasks = structuredClone(SEED_TASKS);
  if (!parsed.affirmations || parsed.affirmations.length === 0) {
    parsed.affirmations = seedAffirmations();
  }
  migrateLegacyGlobalPlans(parsed, calendarToday);

  for (const task of parsed.tasks) {
    if (task.id === "t03" || task.id === "t19") {
      task.archived = true;
      task.hidden = true;
    }
    if (task.id === "t07") {
      task.type = "count";
      task.target = 2;
      task.title = "Brush your teeth (2×)";
    }
    if (task.id === "t09") {
      task.type = "count";
      task.target = 5;
      task.title = "Drink a glass of water (5×)";
    }
    if (task.id === "t12") {
      task.type = "count";
      task.target = 3;
      task.title = "Back exercises (3 sets)";
    }
    if (task.id === "t13") {
      task.type = "count";
      task.target = 2;
      task.title = "Put cream on your fingers (2×)";
    }
    if (task.id === "t29" && task.type === "count") {
      task.target = 2000;
    }
  }

  const ensureTasks = [
    {
      id: "t30",
      title: "Do not bite or scratch my nails",
      group: "body" as const,
      type: "check" as const,
      order: 14.5,
      hidden: false,
      archived: false,
    },
    {
      id: "t31",
      title: "Do not eat any sugar",
      group: "food" as const,
      type: "check" as const,
      order: 18.5,
      hidden: false,
      archived: false,
    },
    {
      id: "t32",
      title: "Make 20 sit-ups (3 sets)",
      group: "body" as const,
      type: "count" as const,
      target: 3,
      order: 12.3,
      hidden: false,
      archived: false,
    },
    {
      id: "t33",
      title: "Make 25 push-ups (3 sets)",
      group: "body" as const,
      type: "count" as const,
      target: 3,
      order: 12.6,
      hidden: false,
      archived: false,
    },
    {
      id: "t34",
      title: "Do not drink any alcohol",
      group: "food" as const,
      type: "check" as const,
      order: 18.7,
      hidden: false,
      archived: false,
    },
    {
      id: "t35",
      title: "Put cream on my toes (2×)",
      group: "body" as const,
      type: "count" as const,
      target: 2,
      order: 13.3,
      hidden: false,
      archived: false,
    },
    {
      id: "t36",
      title: "Put special liquid on my toenail (2×)",
      group: "body" as const,
      type: "count" as const,
      target: 2,
      order: 13.6,
      hidden: false,
      archived: false,
    },
  ];
  for (const task of ensureTasks) {
    if (!parsed.tasks.some((t) => t.id === task.id)) {
      parsed.tasks.push(task);
    }
  }

  return parsed;
}

function readLocalStore(): Store | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return migrateStore(JSON.parse(raw) as Store);
  } catch {
    return null;
  }
}

function readMeta(): Meta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { updatedAt: 0 };
    return JSON.parse(raw) as Meta;
  } catch {
    return { updatedAt: 0 };
  }
}

function writeLocal(store: Store, updatedAt = Date.now()): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
  localStorage.setItem(META_KEY, JSON.stringify({ updatedAt }));
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(text: string): string {
  const pad = "=".repeat((4 - (text.length % 4)) % 4);
  const b64 = (text + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function kvGet(key: string): Promise<string | null> {
  const res = await fetch(`${KV_BASE}/GetValue/${KV_APP}/${key}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data: unknown = await res.json();
  if (data == null || data === "") return null;
  return String(data).replace(/^"|"$/g, "");
}

async function kvSet(key: string, value: string): Promise<void> {
  await fetch(`${KV_BASE}/UpdateValue/${KV_APP}/${key}/${value}`, {
    method: "POST",
    headers: { "Content-Length": "0" },
  });
}

async function pushRemote(syncId: string, store: Store, updatedAt: number) {
  const payload = JSON.stringify({ updatedAt, store });
  const encoded = toBase64Url(payload);
  const chunks: string[] = [];
  for (let i = 0; i < encoded.length; i += CHUNK) {
    chunks.push(encoded.slice(i, i + CHUNK));
  }
  await kvSet(`${syncId}_n`, String(chunks.length));
  await kvSet(`${syncId}_t`, String(updatedAt));
  await Promise.all(chunks.map((chunk, i) => kvSet(`${syncId}_${i}`, chunk)));
}

async function pullRemote(
  syncId: string,
): Promise<{ store: Store; updatedAt: number } | null> {
  try {
    const nRaw = await kvGet(`${syncId}_n`);
    if (!nRaw) return null;
    const n = Number(nRaw);
    if (!Number.isFinite(n) || n <= 0) return null;
    const parts = await Promise.all(
      Array.from({ length: n }, (_, i) => kvGet(`${syncId}_${i}`)),
    );
    if (parts.some((p) => !p)) return null;
    const encoded = parts.join("");
    const parsed = JSON.parse(fromBase64Url(encoded)) as {
      updatedAt: number;
      store: Store;
    };
    return {
      updatedAt: parsed.updatedAt ?? 0,
      store: migrateStore(parsed.store),
    };
  } catch {
    return null;
  }
}

export function getSyncId(): string {
  if (typeof window === "undefined") return "";
  const fromUrl = new URLSearchParams(window.location.search).get("s");
  if (fromUrl && /^[a-zA-Z0-9_-]{6,32}$/.test(fromUrl)) {
    localStorage.setItem(SYNC_KEY, fromUrl);
    return fromUrl;
  }
  const existing = localStorage.getItem(SYNC_KEY);
  if (existing) return existing;
  const id = `dm${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(SYNC_KEY, id);
  return id;
}

export function ensureSyncUrl(syncId: string): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get("s") === syncId) return;
  url.searchParams.set("s", syncId);
  window.history.replaceState({}, "", url.toString());
}

export function shareUrl(syncId: string): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set("s", syncId);
  return url.toString();
}

let memory: Store = defaultStore();
let syncId = "";
let saveTimer: ReturnType<typeof setTimeout> | null = null;

async function loadBootstrap(): Promise<Store | null> {
  try {
    const url = new URL("bootstrap-store.json", window.location.href).href;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return migrateStore((await res.json()) as Store);
  } catch {
    return null;
  }
}

function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Archive completed plans from past days into history.
 * Incomplete plans stay on their own day (visible if you go back).
 * Today always starts with its own empty plan slots.
 */
export function rolloverCompletedDailyPlans(today: string): boolean {
  if (!memory.completedHistory) memory.completedHistory = [];
  let changed = false;

  for (const [date, day] of Object.entries(memory.days)) {
    if (date >= today) continue;
    const plans = ensureDayPlans(day);
    for (const meta of PLAN_HORIZONS) {
      const kept: PlanItem[] = [];
      for (const item of plans[meta.id] ?? []) {
        const done =
          item.completed || Boolean(day.planDone?.[item.id]);
        if (!done) {
          kept.push(item);
          continue;
        }
        const completedOn = item.completedOn ?? date;
        const entry: HistoryEntry = {
          id: `plan-${item.id}-${completedOn}`,
          title: item.text,
          completedOn,
          source: meta.id === "1d" ? "daily-plan" : "plan",
          horizon: meta.id,
          taskId: item.id,
        };
        if (!memory.completedHistory.some((h) => h.id === entry.id)) {
          memory.completedHistory.push(entry);
        }
        changed = true;
      }
      if (kept.length !== (plans[meta.id] ?? []).length) {
        plans[meta.id] = kept;
        changed = true;
      }
    }
  }

  // Ensure calendar today exists with empty slots if missing.
  if (!memory.days[today]) {
    memory.days[today] = emptyDay(today);
    changed = true;
  } else {
    ensureDayPlans(memory.days[today]);
  }

  return changed;
}

export async function initClientDb(): Promise<{
  store: Store;
  syncId: string;
  share: string;
}> {
  syncId = getSyncId();
  ensureSyncUrl(syncId);

  const local = readLocalStore();
  const localMeta = readMeta();
  const remote = await pullRemote(syncId);

  if (remote && remote.updatedAt >= (localMeta.updatedAt || 0)) {
    memory = remote.store;
    writeLocal(memory, remote.updatedAt);
  } else if (local) {
    memory = local;
    if (!remote || (localMeta.updatedAt || 0) > remote.updatedAt) {
      void pushRemote(syncId, memory, localMeta.updatedAt || Date.now());
    }
  } else {
    const boot = await loadBootstrap();
    memory = boot ?? defaultStore();
    const now = Date.now();
    writeLocal(memory, now);
    void pushRemote(syncId, memory, now);
  }

  if (!memory.completedHistory) memory.completedHistory = [];
  if (rolloverCompletedDailyPlans(todayKey())) {
    schedulePush();
  }

  return { store: memory, syncId, share: shareUrl(syncId) };
}

function schedulePush() {
  const updatedAt = Date.now();
  writeLocal(memory, updatedAt);
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void pushRemote(syncId, memory, updatedAt);
  }, 400);
}

function dayRef(date: string): DayLog {
  if (!memory.days[date]) {
    memory.days[date] = emptyDay(date);
  }
  if (!memory.days[date].planDone) memory.days[date].planDone = {};
  if (memory.days[date].moodEvening === undefined) {
    memory.days[date].moodEvening = null;
  }
  if (!memory.days[date].affirmationCounts) {
    memory.days[date].affirmationCounts = {};
  }
  ensureDayPlans(memory.days[date]);
  if (!memory.affirmations) {
    memory.affirmations = seedAffirmations();
  }
  return memory.days[date];
}

export function getState(
  calendarToday: string,
  viewDate = calendarToday,
): AppState {
  calendarAnchor = calendarToday;
  viewAnchor = viewDate;
  if (rolloverCompletedDailyPlans(calendarToday)) {
    schedulePush();
  }
  return buildAppState(memory, calendarToday, viewDate);
}

function refreshState(): AppState {
  const calendar = calendarAnchor || localToday();
  const view = viewAnchor || calendar;
  return getState(calendar, view);
}

export function setTaskCompletion(
  date: string,
  taskId: string,
  completion: { done?: boolean; count?: number },
): AppState {
  const day = dayRef(date);
  day.completions[taskId] = { ...day.completions[taskId], ...completion };
  schedulePush();
  return refreshState();
}

function affirmationTarget(): number {
  const task = memory.tasks.find((t) => t.id === AFFIRMATION_TASK_ID);
  return task?.target ?? 2000;
}

export function bumpAffirmationItem(
  date: string,
  itemId: string,
  delta: number,
): AppState {
  const day = dayRef(date);
  const currentItem = day.affirmationCounts[itemId] ?? 0;
  const nextItem = Math.max(0, currentItem + delta);
  day.affirmationCounts[itemId] = nextItem;

  const currentTotal = day.completions[AFFIRMATION_TASK_ID]?.count ?? 0;
  const max = affirmationTarget();
  const nextTotal = Math.min(max, Math.max(0, currentTotal + delta));
  day.completions[AFFIRMATION_TASK_ID] = {
    ...day.completions[AFFIRMATION_TASK_ID],
    count: nextTotal,
  };

  schedulePush();
  return refreshState();
}

export function addAffirmationLocal(text: string): AppState {
  const trimmed = text.trim();
  if (!trimmed) return refreshState();
  if (!memory.affirmations) memory.affirmations = seedAffirmations();
  const maxOrder = memory.affirmations.reduce(
    (m, item) => Math.max(m, item.order),
    0,
  );
  const item: AffirmationItem = {
    id: `aff${Date.now().toString(36)}`,
    text: trimmed,
    order: maxOrder + 1,
    hidden: false,
  };
  memory.affirmations.push(item);
  schedulePush();
  return refreshState();
}

export function patchAffirmationLocal(
  id: string,
  patch: Partial<Pick<AffirmationItem, "text" | "hidden">>,
): AppState {
  if (!memory.affirmations) memory.affirmations = seedAffirmations();
  const idx = memory.affirmations.findIndex((item) => item.id === id);
  if (idx !== -1) {
    memory.affirmations[idx] = { ...memory.affirmations[idx], ...patch };
    schedulePush();
  }
  return refreshState();
}

export function deleteAffirmationLocal(id: string): AppState {
  if (!memory.affirmations) memory.affirmations = seedAffirmations();
  memory.affirmations = memory.affirmations.filter((item) => item.id !== id);
  for (const day of Object.values(memory.days)) {
    if (day.affirmationCounts?.[id] != null) {
      delete day.affirmationCounts[id];
    }
  }
  schedulePush();
  return refreshState();
}

export function setMood(
  date: string,
  mood: number | null,
  slot: "morning" | "evening" = "morning",
): AppState {
  const day = dayRef(date);
  if (slot === "evening") {
    day.moodEvening = mood;
  } else {
    day.mood = mood;
  }
  schedulePush();
  return refreshState();
}

export function upsertTaskLocal(
  _date: string,
  input: Partial<Task> & { title: string; group: Task["group"] },
): AppState {
  if (input.id) {
    const idx = memory.tasks.findIndex((t) => t.id === input.id);
    if (idx !== -1) {
      memory.tasks[idx] = { ...memory.tasks[idx], ...input, id: input.id };
    }
  } else {
    const maxOrder = memory.tasks.reduce((m, t) => Math.max(m, t.order), 0);
    memory.tasks.push({
      id: `t${Date.now().toString(36)}`,
      title: input.title,
      group: input.group,
      type: input.type ?? "check",
      target: input.target,
      order: input.order ?? maxOrder + 1,
      hidden: input.hidden ?? false,
      archived: input.archived ?? false,
    });
  }
  schedulePush();
  return refreshState();
}

export function patchTaskLocal(
  _date: string,
  id: string,
  patch: Partial<Omit<Task, "id">>,
): AppState {
  const idx = memory.tasks.findIndex((t) => t.id === id);
  if (idx !== -1) {
    memory.tasks[idx] = { ...memory.tasks[idx], ...patch };
    schedulePush();
  }
  return refreshState();
}

export function addPlanLocal(
  date: string,
  horizon: PlanHorizon,
  text: string,
): AppState {
  const day = dayRef(date);
  const item: PlanItem = {
    id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    text: text.trim(),
    horizon,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  day.plans[horizon].push(item);
  schedulePush();
  return refreshState();
}

export function patchPlanLocal(
  date: string,
  id: string,
  patch: Partial<Pick<PlanItem, "text" | "completed">>,
): AppState {
  const day = dayRef(date);
  for (const meta of PLAN_HORIZONS) {
    const idx = day.plans[meta.id].findIndex((p) => p.id === id);
    if (idx !== -1) {
      const current = day.plans[meta.id][idx];
      const next: PlanItem = {
        ...current,
        ...patch,
      };
      if (patch.completed === true) {
        next.completedOn = date;
        day.planDone[id] = true;
      } else if (patch.completed === false) {
        next.completedOn = null;
        day.planDone[id] = false;
      }
      day.plans[meta.id][idx] = next;
      schedulePush();
      break;
    }
  }
  return refreshState();
}

export function deletePlanLocal(date: string, id: string): AppState {
  const day = dayRef(date);
  for (const meta of PLAN_HORIZONS) {
    day.plans[meta.id] = day.plans[meta.id].filter((p) => p.id !== id);
  }
  if (day.planDone[id] != null) delete day.planDone[id];
  schedulePush();
  return refreshState();
}

export function setDailyPlanDoneLocal(
  date: string,
  itemId: string,
  done: boolean,
): AppState {
  return patchPlanLocal(date, itemId, { completed: done });
}
