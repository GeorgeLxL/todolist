import type { TaskWithMeta } from "@/types/task";

export type DoneFilter = "all" | "undone" | "done";
export type RangeFilter = "day" | "week" | "month";

export function parseDoneFilter(v: string | undefined): DoneFilter {
  return v === "undone" || v === "done" ? v : "all";
}

export function parseRange(v: string | undefined): RangeFilter {
  return v === "day" || v === "month" ? v : "week";
}

/** "Undone" hides fully-complete tasks; "Done" shows only them. */
export function filterByDone(
  tasks: TaskWithMeta[],
  filter: DoneFilter,
): TaskWithMeta[] {
  if (filter === "undone") return tasks.filter((t) => !t.is_fully_complete);
  if (filter === "done") return tasks.filter((t) => t.is_fully_complete);
  return tasks;
}
