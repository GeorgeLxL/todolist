import { requireUser } from "@/lib/auth/current-user";
import {
  getWorkspace,
  getTeamsDetailed,
  getUpcomingBirthdays,
  claimBirthdayModal,
} from "@/server/queries";
import { todayInTz } from "@/lib/date-time";
import { TodayProvider } from "@/components/today-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TaskModal } from "@/components/tasks/task-modal";
import { ChangePasswordGate } from "@/components/auth/change-password-gate";
import {
  BirthdayBanner,
  BirthdayModal,
} from "@/components/notifications/birthday";
import { NotificationManager } from "@/components/notifications/notification-manager";
import { DialogHost } from "@/components/ui/dialog";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [workspace, teams, birthdays, showBirthday] = await Promise.all([
    getWorkspace(user),
    getTeamsDetailed(user),
    getUpcomingBirthdays(user),
    claimBirthdayModal(user),
  ]);
  const today = todayInTz(user.timezone);

  return (
    <TodayProvider today={today}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header username={user.username} />
          <BirthdayBanner birthdays={birthdays} />
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>

      <TaskModal
        lists={[...workspace.personalLists, ...workspace.teamLists]}
        teams={teams}
      />
      <ChangePasswordGate force={user.force_password_change} />
      <DialogHost />
      <NotificationManager
        tasks={workspace.tasks}
        userId={user.id}
        today={today}
      />
      {showBirthday && <BirthdayModal username={user.username} />}
    </TodayProvider>
  );
}
