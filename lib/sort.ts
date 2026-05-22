import type { Task } from "@/types/task";

type Sortable = Pick<
  Task,
  "date" | "time" | "is_recurring" | "is_urgent" | "is_important"
>;

/**
 * Effective date used for sorting.
 * - A task with a date uses that date.
 * - A recurring task with no date counts as today (it applies every day).
 * - An undated non-recurring task sorts last.
 */
function effectiveDate(t: Sortable, today: string): string {
  if (t.date) return t.date;
  if (t.is_recurring) return today;
  return "9999-12-31";
}

/** Task sorting: date -> time -> urgent first -> important first. */
export function sortTasks<T extends Sortable>(
  tasks: T[],
  today: string,
): T[] {
  return [...tasks].sort((a, b) => {
    const ad = effectiveDate(a, today);
    const bd = effectiveDate(b, today);
    if (ad !== bd) return ad < bd ? -1 : 1;

    const at = a.time ?? "99:99:99";
    const bt = b.time ?? "99:99:99";
    if (at !== bt) return at < bt ? -1 : 1;

    if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
    if (a.is_important !== b.is_important) return a.is_important ? -1 : 1;
    return 0;
  });
}
