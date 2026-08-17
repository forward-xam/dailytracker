"use client";

import type { Task, TaskCompletion } from "@/lib/types";

interface TaskRowProps {
  task: Task;
  completion?: TaskCompletion;
  streak?: number;
  onToggle: (task: Task) => void;
  onCount: (task: Task, delta: number) => void;
}

export function TaskRow({
  task,
  completion,
  streak = 0,
  onToggle,
  onCount,
}: TaskRowProps) {
  const done =
    task.type === "count"
      ? (completion?.count ?? 0) >= (task.target ?? 1)
      : Boolean(completion?.done);
  const count = completion?.count ?? 0;
  const target = task.target ?? 1;
  const isBigTapper =
    task.type === "count" &&
    (task.id === "t29" ||
      target >= 500 ||
      /affirmation/i.test(task.title));

  if (isBigTapper) {
    return (
      <div className={`task-row task-row--tapper ${done ? "task-row--done" : ""}`}>
        <div className="task-row__body">
          <div className="task-row__title">{task.title}</div>
          <div className="task-row__meta">
            <span>
              {count} / {target}
              {count > 0 && count < target && (
                <span className="partial-chip">
                  {" "}
                  · {Math.round((count / target) * 100)}% of task
                </span>
              )}
            </span>
            {streak > 0 && (
              <span className="streak-chip">
                {streak} day{streak === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="count-bar" aria-hidden>
            <div
              className="count-bar__fill"
              style={{ width: `${Math.min(100, (count / target) * 100)}%` }}
            />
          </div>
        </div>

        <div className="tapper">
          <button
            type="button"
            className="tapper__undo"
            onClick={() => onCount(task, -1)}
            disabled={count <= 0}
            aria-label="Undo one affirmation"
          >
            −1
          </button>
          <button
            type="button"
            className="tapper__hit"
            onClick={() => onCount(task, 1)}
            disabled={count >= target}
            aria-label="Add one affirmation"
          >
            <span className="tapper__plus">+</span>
            <span className="tapper__label">Tap</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`task-row ${done ? "task-row--done" : ""}`}>
      {task.type === "check" ? (
        <button
          type="button"
          className={`check ${done ? "check--on" : ""}`}
          onClick={() => onToggle(task)}
          aria-pressed={done}
          aria-label={done ? `Unmark ${task.title}` : `Mark ${task.title}`}
        >
          <span className="check__mark">{done ? "✓" : ""}</span>
        </button>
      ) : (
        <div className={`count-badge ${done ? "count-badge--on" : ""}`}>
          {Math.min(count, target)}
        </div>
      )}

      <div className="task-row__body">
        <div className="task-row__title">{task.title}</div>
        <div className="task-row__meta">
          {task.type === "count" && (
            <span>
              {count} / {target}
              {count > 0 && count < target && (
                <span className="partial-chip">
                  {" "}
                  · {Math.round((count / target) * 100)}% of task
                </span>
              )}
            </span>
          )}
          {streak > 0 && (
            <span className="streak-chip">
              {streak} day{streak === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {task.type === "count" && (
          <div className="count-bar" aria-hidden>
            <div
              className="count-bar__fill"
              style={{ width: `${Math.min(100, (count / target) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {task.type === "count" && (
        <div className="count-actions">
          <button type="button" onClick={() => onCount(task, -1)} disabled={count <= 0}>
            −
          </button>
          <button
            type="button"
            className="accent"
            onClick={() => onCount(task, 1)}
            disabled={count >= target}
          >
            +1
          </button>
        </div>
      )}
    </div>
  );
}
