import { requireUser } from "@/lib/auth/current-user";
import { getWorkspace } from "@/server/queries";
import { parseDoneFilter } from "@/lib/view-filter";
import { ViewTabs } from "@/components/ui/view-tabs";
import { PriorityMatrix } from "@/components/priority/priority-matrix";

export const dynamic = "force-dynamic";

export default async function PriorityPage({
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
      <PriorityMatrix tasks={ws.tasks} filter={parseDoneFilter(sp.filter)} />
    </div>
  );
}
