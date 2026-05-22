import type { Task, TaskStatus } from "@/types/task";

export function isDoneToday(
  t: Pick<Task, "is_recurring" | "is_done_today" | "done_today_date">,
  today: string,
): boolean {
  return t.is_recurring && t.is_done_today && t.done_today_date === today;
}

/** Fully finished - hidden from "Undone" views. */
export function isTaskDone(t: Pick<Task, "is_fully_complete">): boolean {
  return t.is_fully_complete;
}

export function isOverdue(
  t: Pick<Task, "due_date" | "date" | "is_fully_complete" | "is_recurring">,
  today: string,
): boolean {
  if (t.is_recurring) return false; // recurring tasks repeat, never "overdue"
  const d = t.due_date ?? t.date;
  return !!d && d < today && !t.is_fully_complete;
}

export const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: "bg-surface-2 text-muted",
  progress: "bg-accent/15 text-accent",
  review: "bg-warning/15 text-warning",
  done: "bg-success/15 text-success",
};
