"use client";

import { useState, type FormEvent } from "react";
import type { AffirmationItem } from "@/lib/types";

interface AffirmationListProps {
  items: AffirmationItem[];
  counts: Record<string, number>;
  totalAtTarget: boolean;
  onBump: (id: string, delta: number) => void;
  onAdd: (text: string) => void;
  onHide: (id: string, hidden: boolean) => void;
  onDelete: (id: string) => void;
}

export function AffirmationList({
  items,
  counts,
  totalAtTarget,
  onBump,
  onAdd,
  onHide,
  onDelete,
}: AffirmationListProps) {
  const [open, setOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [draft, setDraft] = useState("");

  const visible = items.filter((item) => !item.hidden);
  const hidden = items.filter((item) => item.hidden);
  const list = showHidden ? [...visible, ...hidden] : visible;

  function submitAdd(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft("");
    setOpen(true);
  }

  return (
    <div className="aff-list">
      <button
        type="button"
        className="aff-list__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          Affirmation list
          <span className="aff-list__count">
            {" "}
            · {visible.length} active
          </span>
        </span>
        <span className="aff-list__chev" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div className="aff-list__panel">
          <p className="aff-list__hint">
            Tap + on a line to count that affirmation — it also adds to the big
            total above.
          </p>

          <ul className="aff-list__items">
            {list.map((item) => {
              const count = counts[item.id] ?? 0;
              return (
                <li
                  key={item.id}
                  className={`aff-item ${item.hidden ? "aff-item--hidden" : ""}`}
                >
                  <div className="aff-item__main">
                    <p className="aff-item__text">{item.text}</p>
                    <div className="aff-item__meta">
                      <span className="aff-item__today">
                        today <strong>{count}</strong>
                      </span>
                      <button
                        type="button"
                        className="aff-item__action"
                        onClick={() => onHide(item.id, !item.hidden)}
                      >
                        {item.hidden ? "Unhide" : "Hide"}
                      </button>
                      <button
                        type="button"
                        className="aff-item__action aff-item__action--danger"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Delete this affirmation permanently?",
                            )
                          ) {
                            onDelete(item.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="aff-item__bump">
                    <button
                      type="button"
                      className="aff-item__minus"
                      disabled={count <= 0}
                      onClick={() => onBump(item.id, -1)}
                      aria-label="Undo one for this affirmation"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="aff-item__plus"
                      disabled={totalAtTarget || item.hidden}
                      onClick={() => onBump(item.id, 1)}
                      aria-label="Add one for this affirmation"
                    >
                      +
                    </button>
                  </div>
                </li>
              );
            })}
            {list.length === 0 && (
              <li className="empty">No affirmations yet. Add one below.</li>
            )}
          </ul>

          {hidden.length > 0 && (
            <button
              type="button"
              className="aff-list__hidden-toggle"
              onClick={() => setShowHidden((v) => !v)}
            >
              {showHidden
                ? "Hide hidden items"
                : `Show ${hidden.length} hidden`}
            </button>
          )}

          <form className="aff-list__add" onSubmit={submitAdd}>
            <label className="aff-list__add-label" htmlFor="aff-new">
              Add affirmation
            </label>
            <textarea
              id="aff-new"
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a new affirmation…"
            />
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!draft.trim()}
            >
              Add to list
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
