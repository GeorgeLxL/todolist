import { requireUser } from "@/lib/auth/current-user";
import { getWorkspace } from "@/server/queries";
import { parseDoneFilter } from "@/lib/view-filter";
import { ViewTabs } from "@/components/ui/view-tabs";
import { KanbanBoard } from "@/components/kanban/kanban-board";

export const dynamic = "force-dynamic";

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  const ws = await getWorkspace(user);
  const sp = await searchParams;

  return (
    <div className="space-y-4">
      <ViewTabs />
      <KanbanBoard tasks={ws.tasks} filter={parseDoneFilter(sp.filter)} />
    </div>
  );
}
