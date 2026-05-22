import { requireUser } from "@/lib/auth/current-user";
import { getArchive } from "@/server/queries";
import { ArchivePanels } from "@/components/archive/archive-panels";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const user = await requireUser();
  const data = await getArchive(user);
  return <ArchivePanels data={data} currentUserId={user.id} />;
}
