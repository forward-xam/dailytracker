import { NextRequest, NextResponse } from "next/server";
import { buildAppState } from "@/lib/stats";
import { readStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const date =
    request.nextUrl.searchParams.get("date") ??
    new Date().toISOString().slice(0, 10);
  const store = await readStore();
  const state = buildAppState(store, date);
  return NextResponse.json(state);
}
