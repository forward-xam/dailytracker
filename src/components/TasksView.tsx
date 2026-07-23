"use client";

import { useMemo, useState, type FormEvent } from "react";
import { GROUPS } from "@/lib/types";
import type { AppState, Task, TaskGroupId, TaskType } from "@/lib/types";

interface TasksViewProps {
  state: AppState;
  busy: boolean;
  onPatch: (
    id: string,
    patch: Partial<Pick<Task, "title" | "hidden" | "archived" | "group" | "type" | "target">>,
  ) => void;
  onCreate: (input: {
    title: string;
    group: TaskGroupId;
    type: TaskType;
    target?: number;
  }) => void;
}

export function TasksView({ state, busy, onPatch, onCreate }: TasksViewProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [title, setTitle] = useState("");
  const [group, setGroup] = useState<TaskGroupId>("morning");
  const [type, setType] = useState<TaskType>("check");
  const [target, setTarget] = useState(10);

  const visible = useMemo(() => {
    return state.tasks
      .filter((t) => (showArchived ? t.archived : !t.archived))
      .sort((a, b) => a.order - b.order);
  }, [state.tasks, showArchived]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      group,
      type,
      target: type === "count" ? target : undefined,
    });
    setTitle("");
    setType("check");
  }

  return (
    <section className={`manage ${busy ? "is-busy" : ""}`}>
      <header className="section-head">
        <p className="brand">Day Mark</p>
        <h1>Edit tasks</h1>
        <p>Hide, archive, or add routines. History stays intact.</p>
      </header>

      <form className="add-form" onSubmit={submit}>
        <label>
          New task
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Stretch for 10 minutes"
          />
        </label>
        <div className="add-form__row">
          <label>
            Group
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value as TaskGroupId)}
            >
              {GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TaskType)}
            >
              <option value="check">Checkbox</option>
              <option value="count">Counter</option>
            </select>
          </label>
          {type === "count" && (
            <label>
              Target
              <input
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value) || 1)}
              />
            </label>
          )}
        </div>
        <button type="submit" className="btn btn--primary">
          Add task
        </button>
      </form>

      <div className="manage__toggle">
        <button
          type="button"
          className={!showArchived ? "chip chip--on" : "chip"}
          onClick={() => setShowArchived(false)}
        >
          Active
        </button>
        <button
          type="button"
          className={showArchived ? "chip chip--on" : "chip"}
          onClick={() => setShowArchived(true)}
        >
          Archived
        </button>
      </div>

      <ul className="manage-list">
        {visible.map((task) => (
          <li key={task.id} className="manage-item">
            <div className="manage-item__main">
              <input
                className="manage-item__title"
                defaultValue={task.title}
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (next && next !== task.title) {
                    onPatch(task.id, { title: next });
                  }
                }}
              />
              <span className="manage-item__meta">
                {GROUPS.find((g) => g.id === task.group)?.label}
                {task.type === "count" ? ` · count to ${task.target}` : ""}
                {task.hidden ? " · hidden" : ""}
              </span>
            </div>
            <div className="manage-item__actions">
              {!task.archived && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => onPatch(task.id, { hidden: !task.hidden })}
                >
                  {task.hidden ? "Show" : "Hide"}
                </button>
              )}
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() =>
                  onPatch(task.id, {
                    archived: !task.archived,
                    hidden: task.archived ? task.hidden : true,
                  })
                }
              >
                {task.archived ? "Restore" : "Archive"}
              </button>
            </div>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="empty">
            {showArchived ? "No archived tasks." : "No active tasks."}
          </li>
        )}
      </ul>
    </section>
  );
}
