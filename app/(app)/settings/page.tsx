import { requireUser } from "@/lib/auth/current-user";
import { SettingsForms } from "@/components/settings/settings-forms";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  return <SettingsForms user={user} />;
}
