"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTeamArchived, deleteTeam } from "@/server/actions/teams";
import { setListArchived, deleteList } from "@/server/actions/lists";
import { TaskCard } from "@/components/tasks/task-card";
import { IconTrash } from "@/components/icons";
import { confirmDialog, alertDialog } from "@/components/ui/dialog";
import type { ArchiveData } from "@/server/queries";

export function ArchivePanels({
  data,
  currentUserId,
}: {
  data: ArchiveData;
  currentUserId: string;
}) {
  const empty =
    data.teams.length === 0 &&
    data.lists.length === 0 &&
    data.tasks.length === 0;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Archived items can be restored, or deleted permanently.
      </p>
      {empty && <p className="text-sm text-muted">Nothing is archived.</p>}

      {data.teams.length > 0 && (
        <Panel title="Teams">
          {data.teams.map((t) => (
            <Row
              key={t.id}
              label={t.name}
              canManage={t.admin_user_id === currentUserId}
              onRestore={() => setTeamArchived(t.id, false)}
              onDelete={() => deleteTeam(t.id)}
              deleteHint="Permanently delete this team and all its data?"
            />
          ))}
        </Panel>
      )}

      {data.lists.length > 0 && (
        <Panel title="Lists">
          {data.lists.map((l) => (
            <Row
              key={l.id}
              label={`${l.type === "team" ? "Team" : "Personal"} · ${l.name}`}
              canManage
              onRestore={() => setListArchived(l.id, false)}
              onDelete={() => deleteList(l.id)}
              deleteHint="Permanently delete this list and its tasks?"
            />
          ))}
        </Panel>
      )}

      {data.tasks.length > 0 && (
        <Panel title="Tasks">
          {data.tasks.map((t) => (
            <TaskCard key={t.id} task={t} mode="archive" />
          ))}
        </Panel>
      )}
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-muted">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({
  label,
  canManage,
  onRestore,
  onDelete,
  deleteHint,
}: {
  label: string;
  canManage: boolean;
  onRestore: () => Promise<{ error?: string }>;
  onDelete: () => Promise<{ error?: string }>;
  deleteHint: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ error?: string }>) {
    start(async () => {
      const res = await fn();
      if (res.error)
        await alertDialog({ title: "Couldn't complete", message: res.error });
      router.refresh();
    });
  }

  return (
    <div className="card flex items-center gap-2 p-3">
      <span className="flex-1 truncate text-sm">{label}</span>
      {canManage ? (
        <>
          <button
            className="chip border border-border text-muted hover:border-primary"
            disabled={pending}
            onClick={() => run(onRestore)}
          >
            Restore
          </button>
          <button
            className="rounded p-1.5 text-danger hover:bg-surface-2"
            title="Delete permanently"
            disabled={pending}
            onClick={async () => {
              const ok = await confirmDialog({
                title: "Delete permanently",
                message: deleteHint,
                confirmLabel: "Delete",
                danger: true,
              });
              if (ok) run(onDelete);
            }}
          >
            <IconTrash className="h-4 w-4" />
          </button>
        </>
      ) : (
        <span className="text-xs text-muted">Admin only</span>
      )}
    </div>
  );
}
