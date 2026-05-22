import { requireUser } from "@/lib/auth/current-user";
import { getWorkspace } from "@/server/queries";
import { parseRange } from "@/lib/view-filter";
import { ViewTabs } from "@/components/ui/view-tabs";
import { CalendarView } from "@/components/calendar/calendar-view";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await requireUser();
  const ws = await getWorkspace(user);
  const sp = await searchParams;

  return (
    <div className="space-y-2">
      <ViewTabs ranges />
      <CalendarView tasks={ws.tasks} range={parseRange(sp.range)} />
    </div>
  );
}
