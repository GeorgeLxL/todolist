"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTeam,
  renameTeam,
  addMember,
  removeMember,
  setTeamArchived,
} from "@/server/actions/teams";
import { IconPlus, IconTrash, IconEdit } from "@/components/icons";
import { confirmDialog, promptDialog } from "@/components/ui/dialog";
import type { TeamDetail } from "@/server/queries";

export function TeamManager({
  teams,
  currentUserId,
}: {
  teams: TeamDetail[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function create() {
    if (!name.trim()) return;
    start(async () => {
      const res = await createTeam(name.trim());
      if (res.error) setError(res.error);
      else {
        setName("");
        setError("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="mb-2 text-sm font-semibold">Create a team</h2>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Team name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn-primary" onClick={create} disabled={pending}>
            <IconPlus className="h-4 w-4" /> Create
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>

      {teams.length === 0 ? (
        <p className="text-sm text-muted">
          You are not on any teams yet. Create one above.
        </p>
      ) : (
        teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            currentUserId={currentUserId}
            router={router}
          />
        ))
      )}
    </div>
  );
}

function TeamCard({
  team,
  currentUserId,
  router,
}: {
  team: TeamDetail;
  currentUserId: string;
  router: ReturnType<typeof useRouter>;
}) {
  const [username, setUsername] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function run(fn: () => Promise<{ error?: string }>) {
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        setError("");
        router.refresh();
      }
    });
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-base font-semibold">{team.name}</h3>
        {team.is_admin && (
          <span className="chip bg-primary/15 text-primary">Admin</span>
        )}
        <span className="chip bg-surface-2 text-muted">
          {team.members.length} members
        </span>
        {team.is_admin && (
          <div className="ml-auto flex gap-1">
            <button
              className="rounded p-1.5 text-muted hover:bg-surface-2"
              title="Rename team"
              onClick={async () => {
                const n = await promptDialog({
                  title: "Rename team",
                  defaultValue: team.name,
                  placeholder: "Team name",
                  confirmLabel: "Rename",
                });
                if (n && n !== team.name) run(() => renameTeam(team.id, n));
              }}
            >
              <IconEdit className="h-4 w-4" />
            </button>
            <button
              className="chip border border-border text-muted hover:border-primary"
              onClick={async () => {
                const ok = await confirmDialog({
                  title: "Archive team",
                  message: `Archive "${team.name}"? You can restore or delete it from the Archive page.`,
                  confirmLabel: "Archive",
                });
                if (ok) run(() => setTeamArchived(team.id, true));
              }}
            >
              Archive
            </button>
          </div>
        )}
      </div>

      <ul className="space-y-1">
        {team.members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm"
          >
            <span>
              {m.username}
              {m.user_id === team.admin_user_id && (
                <span className="ml-2 text-xs text-muted">(admin)</span>
              )}
              {m.user_id === currentUserId && (
                <span className="ml-2 text-xs text-muted">(you)</span>
              )}
            </span>
            {team.is_admin && m.user_id !== team.admin_user_id && (
              <button
                className="rounded p-1 text-danger hover:bg-surface"
                title="Remove member"
                onClick={() => run(() => removeMember(team.id, m.user_id))}
              >
                <IconTrash className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {team.is_admin && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!username.trim()) return;
            run(async () => {
              const res = await addMember(team.id, username.trim());
              if (!res.error) setUsername("");
              return res;
            });
          }}
        >
          <input
            className="input"
            placeholder="Add member by username…"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button className="btn-ghost" disabled={pending}>
            Add
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
