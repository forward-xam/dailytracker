"use client";

import { useMemo } from "react";
import type { AppState, HistoryEntry, HistorySource } from "@/lib/types";
import { formatDisplayDate } from "@/lib/stats";

interface HistoryViewProps {
  state: AppState;
}

function sourceLabel(source: HistorySource, horizon?: string): string {
  if (source === "daily-plan") return "1-day plan";
  if (source === "plan") {
    if (horizon === "10y") return "10-year plan";
    if (horizon === "1y") return "1-year plan";
    if (horizon === "1m") return "1-month plan";
    return "Plan";
  }
  return "Routine";
}

function groupByDate(entries: HistoryEntry[]): [string, HistoryEntry[]][] {
  const map = new Map<string, HistoryEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.completedOn) ?? [];
    list.push(entry);
    map.set(entry.completedOn, list);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export function HistoryView({ state }: HistoryViewProps) {
  const groups = useMemo(
    () => groupByDate(state.completedLog),
    [state.completedLog],
  );

  return (
    <section className="history">
      <header className="section-head">
        <p className="brand brand--compact">Day Mark</p>
        <h1>Completed</h1>
        <p>
          Everything you’ve finished, with the date you completed it. Daily
          plans leave tomorrow’s list once done.
        </p>
      </header>

      {groups.length === 0 ? (
        <div className="panel">
          <p className="empty">
            No completed items yet. Finish a plan or routine and it will show up
            here with the date.
          </p>
        </div>
      ) : (
        groups.map(([date, entries]) => (
          <div key={date} className="panel history-day">
            <h2 className="history-day__title">{formatDisplayDate(date)}</h2>
            <ul className="history-list">
              {entries.map((entry) => (
                <li key={entry.id} className="history-item">
                  <div className="history-item__main">
                    <strong>{entry.title}</strong>
                    <span>{sourceLabel(entry.source, entry.horizon)}</span>
                  </div>
                  <time className="history-item__date" dateTime={entry.completedOn}>
                    {entry.completedOn}
                  </time>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
