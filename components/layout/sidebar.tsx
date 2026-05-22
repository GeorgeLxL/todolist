"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useUi } from "@/lib/stores";
import {
  IconDashboard,
  IconList,
  IconClock,
  IconCalendar,
  IconKanban,
  IconGrid,
  IconUsers,
  IconUser,
  IconArchive,
  IconSettings,
  IconChevron,
} from "@/components/icons";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/lists", label: "List View", Icon: IconList },
  { href: "/upcoming", label: "Upcoming", Icon: IconClock },
  { href: "/calendar", label: "Calendar", Icon: IconCalendar },
  { href: "/kanban", label: "Kanban", Icon: IconKanban },
  { href: "/priority", label: "Priority Matrix", Icon: IconGrid },
  { href: "/teams", label: "Team", Icon: IconUsers },
  { href: "/personal", label: "Personal", Icon: IconUser },
  { href: "/archive", label: "Archive", Icon: IconArchive },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUi();

  return (
    <aside
      className={clsx(
        "flex flex-col border-r bg-surface transition-all duration-200",
        sidebarCollapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={clsx(
          "flex h-14 items-center border-b px-3",
          sidebarCollapsed ? "justify-center" : "justify-between",
        )}
      >
        {!sidebarCollapsed && (
          <span className="text-lg font-bold text-primary">TodoList</span>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1.5 text-muted hover:bg-surface-2"
          aria-label="Toggle sidebar"
        >
          <IconChevron
            className={clsx(
              "h-5 w-5 transition-transform",
              !sidebarCollapsed && "rotate-180",
            )}
          />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {NAV.map(({ href, label, Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                sidebarCollapsed && "justify-center px-0",
                active
                  ? "bg-primary text-primary-fg"
                  : "text-text hover:bg-surface-2",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
