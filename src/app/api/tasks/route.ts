import { NextRequest, NextResponse } from "next/server";
import { buildAppState } from "@/lib/stats";
import { patchTask, readStore, upsertTask } from "@/lib/store";
import type { TaskGroupId, TaskType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    date: string;
    title: string;
    group: TaskGroupId;
    type?: TaskType;
    target?: number;
  };

  if (!body.title?.trim() || !body.group || !body.date) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await upsertTask({
    title: body.title.trim(),
    group: body.group,
    type: body.type ?? "check",
    target: body.target,
  });

  const store = await readStore();
  return NextResponse.json(buildAppState(store, body.date));
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as {
    date: string;
    id: string;
    title?: string;
    group?: TaskGroupId;
    type?: TaskType;
    target?: number;
    hidden?: boolean;
    archived?: boolean;
    order?: number;
  };

  if (!body.id || !body.date) {
    return NextResponse.json({ error: "id and date required" }, { status: 400 });
  }

  const { date, id, ...patch } = body;
  await patchTask(id, patch);
  const store = await readStore();
  return NextResponse.json(buildAppState(store, date));
}
