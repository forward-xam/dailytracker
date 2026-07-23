import { NextRequest, NextResponse } from "next/server";
import { setTaskCompletion, updateDay } from "@/lib/store";
import { buildAppState } from "@/lib/stats";
import { readStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as {
    date: string;
    taskId?: string;
    done?: boolean;
    count?: number;
    mood?: number | null;
  };

  if (!body.date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  if (body.taskId) {
    await setTaskCompletion(body.date, body.taskId, {
      done: body.done,
      count: body.count,
    });
  }

  if (body.mood !== undefined) {
    await updateDay(body.date, { mood: body.mood });
  }

  const store = await readStore();
  return NextResponse.json(buildAppState(store, body.date));
}
