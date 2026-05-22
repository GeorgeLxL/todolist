import { requireUser } from "@/lib/auth/current-user";
import { getTeamsDetailed } from "@/server/queries";
import { TeamManager } from "@/components/team/team-manager";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const user = await requireUser();
  const teams = await getTeamsDetailed(user);
  const active = teams.filter((t) => !t.is_archived);

  return (
    <TeamManager teams={active} currentUserId={user.id} />
  );
}
