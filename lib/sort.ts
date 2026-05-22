/** Task sorting: time ascending -> urgent first -> important first. */
export function sortTasks<
  T extends { time: string | null; is_urgent: boolean; is_important: boolean },
>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const at = a.time ?? "99:99:99";
    const bt = b.time ?? "99:99:99";
    if (at !== bt) return at < bt ? -1 : 1;
    if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
    if (a.is_important !== b.is_important) return a.is_important ? -1 : 1;
    return 0;
  });
}
