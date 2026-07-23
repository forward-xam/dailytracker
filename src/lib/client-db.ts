import { SEED_TASKS } from "./seed";
import { buildAppState } from "./stats";
import type {
  AppState,
  DayLog,
  PlanHorizon,
  PlanItem,
  Store,
  Task,
} from "./types";

const LOCAL_KEY = "daymark-store-v1";
const SYNC_KEY = "daymark-sync-id";
const META_KEY = "daymark-meta-v1";
const KV_APP = "e3oi1v26";
const KV_BASE = "https://keyvalue.immanuel.co/api/KeyVal";
const CHUNK = 800;

type Meta = { updatedAt: number };

function emptyPlans(): Store["plans"] {
  return { "10y": [], "1y": [], "1m": [], "1d": [] };
}

function emptyDay(date: string): DayLog {
  return { date, completions: {}, planDone: {}, mood: null };
}

export function defaultStore(): Store {
  return {
    tasks: structuredClone(SEED_TASKS),
    days: {},
    plans: emptyPlans(),
  };
}

export function migrateStore(parsed: Store): Store {
  if (!parsed.plans) parsed.plans = emptyPlans();
  for (const key of ["10y", "1y", "1m", "1d"] as PlanHorizon[]) {
    if (!parsed.plans[key]) parsed.plans[key] = [];
  }
  for (const day of Object.values(parsed.days ?? {})) {
    if (!day.planDone) day.planDone = {};
  }
  if (!parsed.days) parsed.days = {};
  if (!parsed.tasks) parsed.tasks = structuredClone(SEED_TASKS);

  for (const task of parsed.tasks) {
    if (task.id === "t03" || task.id === "t19") {
      task.archived = true;
      task.hidden = true;
    }
    if (task.id === "t12") {
      task.type = "count";
      task.target = 3;
      task.title = "Back exercises (3 sets)";
    }
    if (task.id === "t29" && task.type === "count") {
      task.target = 2000;
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
  return memory.days[date];
}

export function getState(date: string): AppState {
  return buildAppState(memory, date);
}

export function setTaskCompletion(
  date: string,
  taskId: string,
  completion: { done?: boolean; count?: number },
): AppState {
  const day = dayRef(date);
  day.completions[taskId] = { ...day.completions[taskId], ...completion };
  schedulePush();
  return getState(date);
}

export function setMood(date: string, mood: number | null): AppState {
  dayRef(date).mood = mood;
  schedulePush();
  return getState(date);
}

export function upsertTaskLocal(
  date: string,
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
  return getState(date);
}

export function patchTaskLocal(
  date: string,
  id: string,
  patch: Partial<Omit<Task, "id">>,
): AppState {
  const idx = memory.tasks.findIndex((t) => t.id === id);
  if (idx !== -1) {
    memory.tasks[idx] = { ...memory.tasks[idx], ...patch };
    schedulePush();
  }
  return getState(date);
}

export function addPlanLocal(
  date: string,
  horizon: PlanHorizon,
  text: string,
): AppState {
  const item: PlanItem = {
    id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    text: text.trim(),
    horizon,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  memory.plans[horizon].push(item);
  schedulePush();
  return getState(date);
}

export function patchPlanLocal(
  date: string,
  id: string,
  patch: Partial<Pick<PlanItem, "text" | "completed">>,
): AppState {
  for (const horizon of Object.keys(memory.plans) as PlanHorizon[]) {
    const idx = memory.plans[horizon].findIndex((p) => p.id === id);
    if (idx !== -1) {
      memory.plans[horizon][idx] = {
        ...memory.plans[horizon][idx],
        ...patch,
      };
      schedulePush();
      break;
    }
  }
  return getState(date);
}

export function deletePlanLocal(date: string, id: string): AppState {
  for (const horizon of Object.keys(memory.plans) as PlanHorizon[]) {
    memory.plans[horizon] = memory.plans[horizon].filter((p) => p.id !== id);
  }
  schedulePush();
  return getState(date);
}

export function setDailyPlanDoneLocal(
  date: string,
  itemId: string,
  done: boolean,
): AppState {
  dayRef(date).planDone[itemId] = done;
  schedulePush();
  return getState(date);
}
