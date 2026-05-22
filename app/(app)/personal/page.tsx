import { requireUser } from "@/lib/auth/current-user";
import { getWorkspace } from "@/server/queries";
import { parseDoneFilter } from "@/lib/view-filter";
import { ViewTabs } from "@/components/ui/view-tabs";
import { ListBoard } from "@/components/lists/list-board";

export const dynamic = "force-dynamic";

export default async function PersonalPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  const ws = await getWorkspace(user);
  const sp = await searchParams;
  const filter = parseDoneFilter(sp.filter);

  return (
    <div className="space-y-4">
      <ViewTabs />
      <ListBoard
        personalLists={ws.personalLists}
        teamLists={[]}
        tasks={ws.tasks.filter((t) => t.type === "personal")}
        filter={filter}
        showTeam={false}
      />
    </div>
  );
}
