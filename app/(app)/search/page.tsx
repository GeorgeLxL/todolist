import { requireUser } from "@/lib/auth/current-user";
import { getWorkspace, getTeamsDetailed } from "@/server/queries";
import { sortTasks } from "@/lib/sort";
import { TaskCard } from "@/components/tasks/task-card";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? "").toLowerCase().trim();

  const [ws, teams] = await Promise.all([
    getWorkspace(user),
    getTeamsDetailed(user),
  ]);

  const teamNameMatches = new Set(
    teams.filter((t) => t.name.toLowerCase().includes(q)).map((t) => t.id),
  );

  const results = q
    ? ws.tasks.filter((t) => {
        const hay = [
          t.title,
          t.description,
          t.list_name,
          t.assignee_username,
          t.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (hay.includes(q)) return true;
        if (q === "important" && t.is_important) return true;
        if (q === "urgent" && t.is_urgent) return true;
        if (t.team_id && teamNameMatches.has(t.team_id)) return true;
        return false;
      })
    : [];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">
        Search results{q && ` for “${q}”`}
      </h1>
      {!q ? (
        <p className="text-sm text-muted">
          Type a query in the search box above.
        </p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted">No tasks matched.</p>
      ) : (
        <div className="space-y-2">
          {sortTasks(results).map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}
