import type { TaskWithMeta } from "@/types/task";
import { isDoneGrouped } from "@/lib/task-helpers";

export type DoneFilter = "all" | "undone" | "done";
export type RangeFilter = "day" | "week" | "month";

export function parseDoneFilter(v: string | undefined): DoneFilter {
  return v === "undone" || v === "done" ? v : "all";
}

export function parseRange(v: string | undefined): RangeFilter {
  return v === "day" || v === "month" ? v : "week";
}

/**
 * "Undone" hides fully-complete AND done-today recurring tasks;
 * "Done" shows only those.
 */
export function filterByDone(
  tasks: TaskWithMeta[],
  filter: DoneFilter,
  today: string,
): TaskWithMeta[] {
  if (filter === "undone")
    return tasks.filter((t) => !isDoneGrouped(t, today));
  if (filter === "done")
    return tasks.filter((t) => isDoneGrouped(t, today));
  return tasks;
}
