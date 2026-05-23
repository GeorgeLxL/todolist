import { requireUser } from "@/lib/auth/current-user";
import { getWorkspace, getUpcomingBirthdays } from "@/server/queries";
import { todayInTz, addDays } from "@/lib/date-time";
import { isOverdue, isDoneGrouped } from "@/lib/task-helpers";
import { sortTasks } from "@/lib/sort";
import { TaskCard } from "@/components/tasks/task-card";
import { IconCake } from "@/components/icons";
import type { TaskWithMeta } from "@/types/task";

export const dynamic = "force-dynamic";

function Section({
  title,
  tasks,
  empty,
  today,
}: {
  title: string;
  tasks: TaskWithMeta[];
  empty: string;
  today: string;
}) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="chip bg-surface-2 text-muted">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <div className="space-y-2">
          {sortTasks(tasks, today)
            .slice(0, 8)
            .map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
        </div>
      )}
    </section>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [ws, birthdays] = await Promise.all([
    getWorkspace(user),
    getUpcomingBirthdays(user),
  ]);
  const today = todayInTz(user.timezone);
  const weekEnd = addDays(today, 7);
  const weekAgo = addDays(today, -7);

  // Treat done-today recurring tasks as done for these "active" sections,
  // so the dashboard's Today / Overdue / Upcoming etc. stay focused on
  // what still needs attention.
  const undone = ws.tasks.filter((t) => !isDoneGrouped(t, today));

  const todayTasks = undone.filter(
    (t) => t.date === today || t.due_date === today,
  );
  const overdue = undone.filter((t) => isOverdue(t, today));
  const upcoming = undone.filter((t) => {
    const d = t.date ?? t.due_date;
    return !!d && d > today && d <= weekEnd;
  });
  const assignedToMe = undone.filter(
    (t) => t.type === "team" && t.user_id === user.id,
  );
  const teamTasks = undone.filter((t) => t.type === "team");
  const completedThisWeek = ws.tasks.filter(
    (t) => t.is_fully_complete && t.updated_at.slice(0, 10) >= weekAgo,
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Welcome back, {user.username}</h1>
        <p className="text-sm text-muted">{today}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Today", value: todayTasks.length },
          { label: "Overdue", value: overdue.length },
          { label: "Assigned to me", value: assignedToMe.length },
          { label: "Done this week", value: completedThisWeek.length },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {birthdays.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <IconCake className="h-4 w-4 text-accent" /> Birthdays
          </h2>
          <ul className="space-y-1 text-sm">
            {birthdays.map((b, i) => (
              <li key={i}>
                {b.when === "today"
                  ? `Today is ${b.username}'s birthday.`
                  : `Tomorrow is ${b.username}'s birthday.`}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title="Today"
          tasks={todayTasks}
          empty="Nothing scheduled for today."
          today={today}
        />
        <Section
          title="Overdue"
          tasks={overdue}
          empty="No overdue tasks. Nice."
          today={today}
        />
        <Section
          title="Upcoming (7 days)"
          tasks={upcoming}
          empty="Nothing coming up this week."
          today={today}
        />
        <Section
          title="Assigned to me"
          tasks={assignedToMe}
          empty="No team tasks assigned to you."
          today={today}
        />
        <Section
          title="Team tasks"
          tasks={teamTasks}
          empty="No active team tasks."
          today={today}
        />
        <Section
          title="Completed this week"
          tasks={completedThisWeek}
          empty="No tasks completed yet this week."
          today={today}
        />
      </div>
    </div>
  );
}
