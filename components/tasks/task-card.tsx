"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useToday } from "@/components/today-context";
import { useTaskModal } from "@/lib/stores";
import { confirmDialog, alertDialog } from "@/components/ui/dialog";
import { isDoneToday, isOverdue, STATUS_COLOR } from "@/lib/task-helpers";
import { STATUS_LABEL, type Task, type TaskWithMeta } from "@/types/task";
import { formatTime, formatDateHuman } from "@/lib/date-time";
import {
  IconCheck,
  IconEdit,
  IconArchive,
  IconTrash,
  IconChevron,
} from "@/components/icons";
import {
  toggleTaskDone,
  markDoneToday,
  completeRecurringTask,
  setTaskArchived,
  deleteTask,
} from "@/server/actions/tasks";

type Result = { error?: string };

export function TaskCard({
  task,
  showList = true,
  mode = "normal",
}: {
  task: TaskWithMeta;
  showList?: boolean;
  mode?: "normal" | "archive";
}) {
  const today = useToday();
  const router = useRouter();
  const [, start] = useTransition();
  const openEdit = useTaskModal((s) => s.openEdit);

  // Local copy so actions reflect instantly; re-syncs when server data arrives.
  const [local, setLocal] = useState<TaskWithMeta>(task);
  const [hidden, setHidden] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    setLocal(task);
    setHidden(false);
  }, [task]);

  /** Apply an optimistic patch immediately, then sync to the server. */
  function mutate(patch: Partial<Task>, action: () => Promise<Result>) {
    const prev = local;
    setLocal({ ...local, ...patch });
    start(async () => {
      const res = await action();
      if (res?.error) {
        setLocal(prev);
        await alertDialog({
          title: "Couldn't update task",
          message: res.error,
        });
      } else {
        router.refresh();
      }
    });
  }

  /** Optimistically remove the card (archive / restore / delete). */
  function removeCard(action: () => Promise<Result>) {
    setHidden(true);
    start(async () => {
      const res = await action();
      if (res?.error) {
        setHidden(false);
        await alertDialog({
          title: "Couldn't update task",
          message: res.error,
        });
      } else {
        router.refresh();
      }
    });
  }

  if (hidden) return null;

  const doneToday = isDoneToday(local, today);
  const fully = local.is_fully_complete;
  const overdue = isOverdue(local, today);

  function toggleCheckbox() {
    if (local.is_recurring) {
      if (fully) {
        // A fully-completed recurring task: unchecking re-opens it to a
        // fresh state (todo, not done today).
        mutate(
          {
            is_fully_complete: false,
            status: "todo",
            is_done_today: false,
            done_today_date: null,
          },
          () => completeRecurringTask(local.id),
        );
      } else {
        mutate(
          doneToday
            ? { is_done_today: false, status: "todo" }
            : {
                is_done_today: true,
                done_today_date: today,
                status: "progress",
              },
          () => markDoneToday(local.id),
        );
      }
    } else {
      mutate(
        fully
          ? { status: "todo", is_done_today: false, is_fully_complete: false }
          : { status: "done", is_done_today: true, is_fully_complete: true },
        () => toggleTaskDone(local.id),
      );
    }
  }

  function toggleComplete() {
    mutate(
      fully
        ? {
            is_fully_complete: false,
            status: "todo",
            is_done_today: false,
            done_today_date: null,
          }
        : { is_fully_complete: true, status: "done" },
      () => completeRecurringTask(local.id),
    );
  }

  return (
    <div
      className={clsx(
        "card flex items-start gap-3 p-3",
        fully && "opacity-70",
        overdue && "border-2 border-danger bg-danger/15",
      )}
    >
      {mode === "normal" && (
        <button
          onClick={toggleCheckbox}
          className={clsx(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
            fully || doneToday
              ? "border-success bg-success text-white"
              : "border-border hover:border-primary",
          )}
          title={local.is_recurring ? "Mark done today" : "Mark done"}
        >
          {(fully || doneToday) && <IconCheck className="h-3.5 w-3.5" />}
        </button>
      )}

      <div
        className="min-w-0 flex-1 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
        title={expanded ? "Collapse" : "Expand"}
      >
        <div className="flex items-start gap-1.5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <span
              className={clsx(
                "text-sm font-medium",
                fully && "line-through text-muted",
              )}
            >
              {local.title}
            </span>
            {local.is_urgent && (
              <span className="chip bg-danger/15 text-danger">Urgent</span>
            )}
            {local.is_important && (
              <span className="chip bg-warning/15 text-warning">
                Important
              </span>
            )}
            {local.is_recurring && (
              <span className="chip bg-accent/15 text-accent">
                ↻ Recurring
              </span>
            )}
            {doneToday && !fully && (
              <span className="chip border border-success text-success">
                Completed today
              </span>
            )}
            {overdue && (
              <span className="chip bg-danger/15 text-danger">Overdue</span>
            )}
          </div>
          <IconChevron
            className={clsx(
              "mt-0.5 h-4 w-4 shrink-0 text-muted transition-transform",
              expanded && "rotate-90",
            )}
          />
        </div>

        {expanded && local.description && (
          <p className="mt-1.5 whitespace-pre-wrap text-xs text-muted">
            {local.description}
          </p>
        )}

        {expanded && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className={clsx("chip", STATUS_COLOR[local.status])}>
              {STATUS_LABEL[local.status]}
            </span>
            {local.time && <span>{formatTime(local.time)}</span>}
            {local.date && <span>{formatDateHuman(local.date)}</span>}
            {local.due_date && (
              <span>
                {local.is_recurring ? "Until" : "Due"}{" "}
                {formatDateHuman(local.due_date)}
              </span>
            )}
            {showList && <span>· {local.list_name}</span>}
            {local.type === "team" && (
              <span>
                ·{" "}
                {local.assignee_username
                  ? `@${local.assignee_username}`
                  : "Unassigned"}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {mode === "normal" ? (
          <>
            {local.is_recurring && (
              <button
                onClick={toggleComplete}
                className={clsx(
                  "chip border",
                  fully
                    ? "border-success text-success"
                    : "border-border text-muted hover:border-primary",
                )}
                title="Finish this recurring task forever"
              >
                {fully ? "Completed" : "Complete"}
              </button>
            )}
            <button
              onClick={() => openEdit(local)}
              className="rounded p-1.5 text-muted hover:bg-surface-2"
              title="Edit"
            >
              <IconEdit className="h-4 w-4" />
            </button>
            <button
              onClick={() => removeCard(() => setTaskArchived(local.id, true))}
              className="rounded p-1.5 text-muted hover:bg-surface-2"
              title="Archive"
            >
              <IconArchive className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => removeCard(() => setTaskArchived(local.id, false))}
              className="chip border border-border text-muted hover:border-primary"
            >
              Restore
            </button>
            <button
              onClick={async () => {
                const ok = await confirmDialog({
                  title: "Delete task",
                  message: `Permanently delete "${local.title}"? This cannot be undone.`,
                  confirmLabel: "Delete",
                  danger: true,
                });
                if (ok) removeCard(() => deleteTask(local.id));
              }}
              className="rounded p-1.5 text-danger hover:bg-surface-2"
              title="Delete permanently"
            >
              <IconTrash className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
