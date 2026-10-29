"use client";

import { useMemo, useState } from "react";
import { formatDisplayDate } from "@/lib/stats";
import type { AppState, DayStats } from "@/lib/types";

interface StatsViewProps {
  state: AppState;
  today: string;
}

function heatClass(
  percent: number,
  hasActivity: boolean,
  selected: boolean,
): string {
  const base =
    !hasActivity && percent === 0
      ? "heat heat--empty"
      : percent >= 100
        ? "heat heat--100"
        : percent >= 80
          ? "heat heat--80"
          : percent >= 50
            ? "heat heat--50"
            : percent > 0
              ? "heat heat--20"
              : "heat heat--empty";
  return selected ? `${base} heat--selected` : base;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function StatsView({ state, today }: StatsViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const byDate = useMemo(() => {
    return new Map(state.history.map((h) => [h.date, h]));
  }, [state.history]);

  const allDays = useMemo(() => {
    const dates = state.history
      .map((h) => h.date)
      .filter((d) => d <= today)
      .sort();
    if (dates.length === 0) return [] as DayStats[];

    const start = dates[0];
    const days: DayStats[] = [];
    let cursor = start;
    while (cursor <= today) {
      days.push(
        byDate.get(cursor) ?? {
          date: cursor,
          completed: 0,
          total: state.todayStats.total,
          percent: 0,
          mood: null,
        },
      );
      cursor = shiftDate(cursor, 1);
    }
    return days;
  }, [state.history, state.todayStats.total, today, byDate]);

  const activeDays = useMemo(
    () =>
      allDays.filter(
        (d) => d.completed > 0 || d.mood != null || d.percent > 0,
      ),
    [allDays],
  );

  const allTimeAvg = useMemo(() => {
    if (activeDays.length === 0) return 0;
    return Math.round(
      activeDays.reduce((s, d) => s + d.percent, 0) / activeDays.length,
    );
  }, [activeDays]);

  const avg7 = useMemo(() => {
    const slice = allDays.slice(-7);
    if (slice.length === 0) return 0;
    return Math.round(slice.reduce((s, d) => s + d.percent, 0) / slice.length);
  }, [allDays]);

  const bestDay = useMemo(() => {
    if (activeDays.length === 0) return null;
    return activeDays.reduce((best, d) =>
      d.percent > best.percent ? d : best,
    );
  }, [activeDays]);

  const selected =
    byDate.get(selectedDate) ??
    allDays.find((d) => d.date === selectedDate) ??
    state.todayStats;

  const dayList = useMemo(
    () =>
      [...allDays]
        .filter(
          (h) =>
            h.date <= today &&
            (h.completed > 0 || h.mood != null || h.percent > 0 || h.date === today),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [allDays, today],
  );

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

  const periodLabel =
    allDays.length <= 1
      ? "Today"
      : `${allDays[0]?.date ?? "—"} → ${today}`;

  return (
    <section className="stats">
      <header className="section-head">
        <p className="brand brand--compact">Day Mark</p>
        <h1>Statistics</h1>
        <p>Full history — tap any day to see that day’s completion %.</p>
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
          <span className="metric__label">All-time avg</span>
          <strong className="metric__value">{allTimeAvg}%</strong>
          <span className="metric__hint">
            {activeDays.length} active day{activeDays.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="metric">
          <span className="metric__label">7-day average</span>
          <strong className="metric__value">{avg7}%</strong>
          <span className="metric__hint">recent week</span>
        </div>
        <div className="metric">
          <span className="metric__label">Today</span>
          <strong className="metric__value">{state.todayStats.percent}%</strong>
          <span className="metric__hint">
            {state.todayStats.completed}/{state.todayStats.total} tasks
          </span>
        </div>
        <div className="metric">
          <span className="metric__label">Best day</span>
          <strong className="metric__value">
            {bestDay ? `${bestDay.percent}%` : "—"}
          </strong>
          <span className="metric__hint">
            {bestDay ? bestDay.date : "no data yet"}
          </span>
        </div>
      </div>

      <div className="panel day-detail">
        <div className="day-detail__head">
          <div>
            <span className="metric__label">Selected day</span>
            <h2>{formatDisplayDate(selected.date)}</h2>
          </div>
          <strong className="day-detail__pct">{selected.percent}%</strong>
        </div>
        <div className="day-detail__meta">
          <span>
            {selected.completed}/{selected.total} completed
          </span>
          {selected.mood != null && <span>Mood {selected.mood}/10</span>}
        </div>
        <div className="day-detail__bar-wrap" aria-hidden>
          <div
            className="day-detail__bar"
            style={{ width: `${selected.percent}%` }}
          />
        </div>
      </div>

      <div className="panel">
        <h2>All period</h2>
        <p className="stats-period">{periodLabel}</p>
        <div className="heat-grid heat-grid--full">
          {allDays.map((day) => {
            const hasActivity =
              day.completed > 0 || day.mood != null || day.percent > 0;
            return (
              <button
                key={day.date}
                type="button"
                className={heatClass(
                  day.percent,
                  hasActivity || day.date === today,
                  day.date === selectedDate,
                )}
                title={`${day.date}: ${day.percent}%`}
                aria-label={`${day.date}, ${day.percent}% complete`}
                aria-pressed={day.date === selectedDate}
                onClick={() => setSelectedDate(day.date)}
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
        <h2>Every day</h2>
        <ul className="day-list">
          {dayList.map((day) => (
            <li key={day.date}>
              <button
                type="button"
                className={`day-list__item day-list__btn ${
                  day.date === selectedDate ? "day-list__btn--on" : ""
                }`}
                onClick={() => setSelectedDate(day.date)}
              >
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
              </button>
            </li>
          ))}
          {dayList.length === 0 && (
            <li className="empty">No history yet. Mark tasks today to start.</li>
          )}
        </ul>
      </div>

      <div className="panel">
        <h2>Task streaks</h2>
        {topStreaks.length === 0 ? (
          <p className="empty">
            Complete the same task on consecutive days to build a streak.
          </p>
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
