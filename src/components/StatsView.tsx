"use client";

import { useMemo } from "react";
import type { AppState, DayStats } from "@/lib/types";

interface StatsViewProps {
  state: AppState;
  today: string;
}

function heatClass(percent: number, hasActivity: boolean): string {
  if (!hasActivity && percent === 0) return "heat heat--empty";
  if (percent >= 100) return "heat heat--100";
  if (percent >= 80) return "heat heat--80";
  if (percent >= 50) return "heat heat--50";
  if (percent > 0) return "heat heat--20";
  return "heat heat--empty";
}

export function StatsView({ state, today }: StatsViewProps) {
  const last30 = useMemo(() => {
    const map = new Map(state.history.map((h) => [h.date, h]));
    const days: DayStats[] = [];
    const base = new Date(`${today}T12:00:00`);
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push(
        map.get(key) ?? {
          date: key,
          completed: 0,
          total: state.todayStats.total,
          percent: 0,
          mood: null,
        },
      );
    }
    return days;
  }, [state.history, state.todayStats.total, today]);

  const recent = useMemo(
    () =>
      [...state.history]
        .filter((h) => h.date <= today && (h.completed > 0 || h.mood != null || h.date === today))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 14),
    [state.history, today],
  );

  const avg7 = useMemo(() => {
    const slice = last30.slice(-7);
    if (slice.length === 0) return 0;
    return Math.round(slice.reduce((s, d) => s + d.percent, 0) / slice.length);
  }, [last30]);

  const topStreaks = useMemo(() => {
    return state.tasks
      .filter((t) => !t.archived && !t.hidden)
      .map((t) => ({
        id: t.id,
        title: t.title,
        streak: state.taskStreaks[t.id] ?? 0,
      }))
      .filter((t) => t.streak > 0)
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 8);
  }, [state.tasks, state.taskStreaks]);

  return (
    <section className="stats">
      <header className="section-head">
        <p className="brand">Day Mark</p>
        <h1>Statistics</h1>
        <p>Daily completion, streaks, and how the last month looks.</p>
      </header>

      <div className="stats-grid">
        <div className="metric">
          <span className="metric__label">Current streak</span>
          <strong className="metric__value accent">{state.streak.current}</strong>
          <span className="metric__hint">
            days at {state.streak.threshold}%+
          </span>
        </div>
        <div className="metric">
          <span className="metric__label">Best streak</span>
          <strong className="metric__value">{state.streak.best}</strong>
          <span className="metric__hint">personal record</span>
        </div>
        <div className="metric">
          <span className="metric__label">7-day average</span>
          <strong className="metric__value">{avg7}%</strong>
          <span className="metric__hint">completion</span>
        </div>
        <div className="metric">
          <span className="metric__label">Today</span>
          <strong className="metric__value">{state.todayStats.percent}%</strong>
          <span className="metric__hint">
            {state.todayStats.completed}/{state.todayStats.total} tasks
          </span>
        </div>
      </div>

      <div className="panel">
        <h2>Last 30 days</h2>
        <div className="heat-grid">
          {last30.map((day) => {
            const hasActivity =
              day.completed > 0 ||
              day.mood != null ||
              Boolean(
                state.history.find((h) => h.date === day.date && h.percent > 0),
              );
            return (
              <div
                key={day.date}
                className={heatClass(day.percent, hasActivity || day.date === today)}
                title={`${day.date}: ${day.percent}%`}
              />
            );
          })}
        </div>
        <div className="heat-legend">
          <span>Less</span>
          <span className="heat heat--empty" />
          <span className="heat heat--20" />
          <span className="heat heat--50" />
          <span className="heat heat--80" />
          <span className="heat heat--100" />
          <span>More</span>
        </div>
      </div>

      <div className="panel">
        <h2>Recent days</h2>
        <ul className="day-list">
          {recent.map((day) => (
            <li key={day.date} className="day-list__item">
              <div>
                <strong>{day.date}</strong>
                {day.mood != null && (
                  <span className="day-list__mood">mood {day.mood}/10</span>
                )}
              </div>
              <div className="day-list__bar-wrap">
                <div
                  className="day-list__bar"
                  style={{ width: `${day.percent}%` }}
                />
              </div>
              <span className="day-list__pct">{day.percent}%</span>
            </li>
          ))}
          {recent.length === 0 && (
            <li className="empty">No history yet. Mark tasks today to start.</li>
          )}
        </ul>
      </div>

      <div className="panel">
        <h2>Task streaks</h2>
        {topStreaks.length === 0 ? (
          <p className="empty">Complete the same task on consecutive days to build a streak.</p>
        ) : (
          <ul className="streak-list">
            {topStreaks.map((item) => (
              <li key={item.id}>
                <span>{item.title}</span>
                <strong>{item.streak}d</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
