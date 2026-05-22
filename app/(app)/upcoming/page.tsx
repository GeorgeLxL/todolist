import { requireUser } from "@/lib/auth/current-user";
import { getWorkspace } from "@/server/queries";
import { parseRange } from "@/lib/view-filter";
import { todayInTz, addDays, formatDateHuman, dayDiff } from "@/lib/date-time";
import { sortTasks } from "@/lib/sort";
import { ViewTabs } from "@/components/ui/view-tabs";
import { TaskCard } from "@/components/tasks/task-card";
import type { TaskWithMeta } from "@/types/task";

export const dynamic = "force-dynamic";

export default async function UpcomingPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await requireUser();
  const ws = await getWorkspace(user);
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const today = todayInTz(user.timezone);
  const span = range === "day" ? 0 : range === "week" ? 6 : 29;
  const end = addDays(today, span);

  const relevant = ws.tasks.filter((t) => {
    if (t.is_fully_complete) return false;
    if (t.type === "team" && t.user_id !== user.id) return false;
    const d = t.date ?? t.due_date;
    return !!d && d >= today && d <= end;
  });

  const groups = new Map<string, TaskWithMeta[]>();
  for (const t of relevant) {
    const d = (t.date ?? t.due_date) as string;
    const arr = groups.get(d) ?? [];
    arr.push(t);
    groups.set(d, arr);
  }
  const days = [...groups.keys()].sort();

  return (
    <div className="space-y-4">
      <ViewTabs ranges />
      {days.length === 0 ? (
        <p className="text-sm text-muted">
          No upcoming tasks in this range.
        </p>
      ) : (
        days.map((d) => {
          const diff = dayDiff(today, d);
          const label =
            diff === 0
              ? "Today"
              : diff === 1
                ? "Tomorrow"
                : formatDateHuman(d);
          return (
            <section key={d} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted">
                {label}
                <span className="ml-2 font-normal">{formatDateHuman(d)}</span>
              </h2>
              {sortTasks(groups.get(d)!, today).map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
