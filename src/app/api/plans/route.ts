import { NextRequest, NextResponse } from "next/server";
import { buildAppState } from "@/lib/stats";
import {
  addPlanItem,
  deletePlanItem,
  patchPlanItem,
  readStore,
  setDailyPlanDone,
} from "@/lib/store";
import type { PlanHorizon } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    date: string;
    horizon: PlanHorizon;
    text: string;
  };

  if (!body.date || !body.horizon || !body.text?.trim()) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await addPlanItem(body.horizon, body.text);
  const store = await readStore();
  return NextResponse.json(buildAppState(store, body.date));
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as {
    date: string;
    id: string;
    text?: string;
    completed?: boolean;
    /** For 1-day plans: mark done for this date */
    dailyDone?: boolean;
    delete?: boolean;
  };

  if (!body.date || !body.id) {
    return NextResponse.json({ error: "id and date required" }, { status: 400 });
  }

  if (body.delete) {
    await deletePlanItem(body.id);
  } else if (body.dailyDone !== undefined) {
    await setDailyPlanDone(body.date, body.id, body.dailyDone);
  } else {
    await patchPlanItem(body.id, {
      text: body.text,
      completed: body.completed,
    });
  }

  const store = await readStore();
  return NextResponse.json(buildAppState(store, body.date));
}
