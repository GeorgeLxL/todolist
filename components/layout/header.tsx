"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTaskModal } from "@/lib/stores";
import { logoutAction } from "@/server/actions/auth";
import { IconPlus, IconSearch, IconUser } from "@/components/icons";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/lists": "List View",
  "/upcoming": "Upcoming",
  "/calendar": "Calendar",
  "/kanban": "Kanban",
  "/priority": "Priority Matrix",
  "/teams": "Team",
  "/personal": "Personal",
  "/archive": "Archive",
  "/settings": "Settings",
  "/search": "Search",
};

export function Header({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const openCreate = useTaskModal((s) => s.openCreate);
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);

  const title =
    Object.entries(TITLES).find(([p]) => pathname.startsWith(p))?.[1] ??
    "TodoList";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-surface px-4">
      <h1 className="text-base font-semibold">{title}</h1>

      <form
        className="relative ml-auto hidden sm:block"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <IconSearch className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tasks…"
          className="input w-56 pl-8"
        />
      </form>

      <button
        onClick={() => openCreate()}
        className="btn-primary"
        title="New task"
      >
        <IconPlus className="h-4 w-4" />
        <span className="hidden sm:inline">New task</span>
      </button>

      <div className="relative">
        <button
          onClick={() => setMenu((m) => !m)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text hover:bg-border"
          title={username}
        >
          <IconUser className="h-5 w-5" />
        </button>
        {menu && (
          <div className="absolute right-0 z-30 mt-2 w-44 rounded-lg border bg-surface p-1 shadow-lg">
            <div className="px-3 py-2 text-sm font-medium">{username}</div>
            <div className="border-t" />
            <form action={logoutAction}>
              <button className="w-full rounded px-3 py-2 text-left text-sm text-danger hover:bg-surface-2">
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
