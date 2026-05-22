import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserTeamIds } from "@/lib/permissions";
import { todayInTz } from "@/lib/date-time";
import type { User } from "@/types/user";
import type { List } from "@/types/list";
import type { Task, TaskWithMeta } from "@/types/task";
import type { Team } from "@/types/team";

/** Map of id -> value for quick lookups. */
function indexBy<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((r) => [r.id, r]));
}

function enrich(
  tasks: Task[],
  lists: Map<string, List>,
  users: Map<string, { id: string; username: string }>,
): TaskWithMeta[] {
  return tasks.map((t) => ({
    ...t,
    list_name: lists.get(t.list_id)?.name ?? "Unknown list",
    assignee_username: t.user_id ? users.get(t.user_id)?.username ?? null : null,
  }));
}

export interface Workspace {
  personalLists: List[];
  teamLists: List[];
  teams: Team[];
  tasks: TaskWithMeta[];
}

/** Everything the authenticated user can see (non-archived). */
export const getWorkspace = cache(async function getWorkspace(
  user: User,
): Promise<Workspace> {
  const db = supabaseAdmin();
  const teamIds = await getUserTeamIds(user.id);

  // All independent reads run in a single parallel batch.
  const [
    personalListsRes,
    teamListsRes,
    teamsRes,
    personalTasksRes,
    teamTasksRes,
  ] = await Promise.all([
    db
      .from("lists")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("sort_order"),
    teamIds.length
      ? db
          .from("lists")
          .select("*")
          .in("team_id", teamIds)
          .eq("is_archived", false)
          .order("sort_order")
      : Promise.resolve({ data: [] as List[] }),
    teamIds.length
      ? db
          .from("teams")
          .select("*")
          .in("id", teamIds)
          .eq("is_archived", false)
      : Promise.resolve({ data: [] as Team[] }),
    db
      .from("tasks")
      .select("*")
      .eq("type", "personal")
      .eq("user_id", user.id)
      .eq("is_archived", false),
    teamIds.length
      ? db
          .from("tasks")
          .select("*")
          .eq("type", "team")
          .in("team_id", teamIds)
          .eq("is_archived", false)
      : Promise.resolve({ data: [] as Task[] }),
  ]);

  const personalLists = (personalListsRes.data ?? []) as List[];
  const teamLists = (teamListsRes.data ?? []) as List[];
  const teams = (teamsRes.data ?? []) as Team[];

  const rawTasks = [
    ...((personalTasksRes.data ?? []) as Task[]),
    ...((teamTasksRes.data ?? []) as Task[]),
  ];

  // Overdue tasks are automatically flagged urgent. This runs at most once
  // per task (afterwards they are already urgent, so the set is empty).
  const todayStr = todayInTz(user.timezone);
  const overdueIds = rawTasks
    .filter(
      (t) =>
        !t.is_recurring &&
        !t.is_urgent &&
        !t.is_fully_complete &&
        !!(t.due_date ?? t.date) &&
        (t.due_date ?? t.date)! < todayStr,
    )
    .map((t) => t.id);
  if (overdueIds.length) {
    await db.from("tasks").update({ is_urgent: true }).in("id", overdueIds);
    const overdueSet = new Set(overdueIds);
    for (const t of rawTasks) {
      if (overdueSet.has(t.id)) t.is_urgent = true;
    }
  }

  const listMap = indexBy<List>([...personalLists, ...teamLists]);

  const assigneeIds = Array.from(
    new Set(rawTasks.map((t) => t.user_id).filter(Boolean) as string[]),
  );
  const usersRes = assigneeIds.length
    ? await db.from("users").select("id, username").in("id", assigneeIds)
    : { data: [] as { id: string; username: string }[] };
  const userMap = indexBy(
    (usersRes.data ?? []) as { id: string; username: string }[],
  );

  return {
    personalLists,
    teamLists,
    teams,
    tasks: enrich(rawTasks, listMap, userMap),
  };
});

export interface TeamDetail extends Team {
  members: { id: string; user_id: string; username: string }[];
  is_admin: boolean;
}

/** Teams the user belongs to, with member lists. */
export const getTeamsDetailed = cache(async function getTeamsDetailed(
  user: User,
): Promise<TeamDetail[]> {
  const db = supabaseAdmin();
  const teamIds = await getUserTeamIds(user.id);
  if (!teamIds.length) return [];

  const { data: teams } = await db.from("teams").select("*").in("id", teamIds);
  const { data: members } = await db
    .from("team_members")
    .select("id, team_id, user_id")
    .in("team_id", teamIds);

  const memberUserIds = Array.from(
    new Set((members ?? []).map((m) => m.user_id as string)),
  );
  const { data: users } = memberUserIds.length
    ? await db.from("users").select("id, username").in("id", memberUserIds)
    : { data: [] };
  const userMap = indexBy(
    (users ?? []) as { id: string; username: string }[],
  );

  return ((teams ?? []) as Team[]).map((team) => ({
    ...team,
    is_admin: team.admin_user_id === user.id,
    members: (members ?? [])
      .filter((m) => m.team_id === team.id)
      .map((m) => ({
        id: m.id as string,
        user_id: m.user_id as string,
        username: userMap.get(m.user_id as string)?.username ?? "unknown",
      })),
  }));
});

export interface ArchiveData {
  teams: Team[];
  lists: List[];
  tasks: TaskWithMeta[];
}

/** Archived teams / lists / tasks the user can manage. */
export async function getArchive(user: User): Promise<ArchiveData> {
  const db = supabaseAdmin();
  const teamIds = await getUserTeamIds(user.id);

  const [teamsRes, personalListsRes, teamListsRes, personalTasksRes] =
    await Promise.all([
      teamIds.length
        ? db.from("teams").select("*").in("id", teamIds).eq("is_archived", true)
        : Promise.resolve({ data: [] as Team[] }),
      db
        .from("lists")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_archived", true),
      teamIds.length
        ? db
            .from("lists")
            .select("*")
            .in("team_id", teamIds)
            .eq("is_archived", true)
        : Promise.resolve({ data: [] as List[] }),
      db
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "personal")
        .eq("is_archived", true),
    ]);

  const teamTasksRes = teamIds.length
    ? await db
        .from("tasks")
        .select("*")
        .in("team_id", teamIds)
        .eq("type", "team")
        .eq("is_archived", true)
    : { data: [] as Task[] };

  const lists = [
    ...((personalListsRes.data ?? []) as List[]),
    ...((teamListsRes.data ?? []) as List[]),
  ];
  const rawTasks = [
    ...((personalTasksRes.data ?? []) as Task[]),
    ...((teamTasksRes.data ?? []) as Task[]),
  ];
  const listMap = indexBy(lists);

  return {
    teams: (teamsRes.data ?? []) as Team[],
    lists,
    tasks: enrich(rawTasks, listMap, new Map()),
  };
}

/** Team members of the current user's teams who have a birthday today/tomorrow. */
export async function getUpcomingBirthdays(
  user: User,
): Promise<{ username: string; when: "today" | "tomorrow" }[]> {
  const db = supabaseAdmin();
  const teamIds = await getUserTeamIds(user.id);
  if (!teamIds.length) return [];

  const { data: members } = await db
    .from("team_members")
    .select("user_id")
    .in("team_id", teamIds);
  const ids = Array.from(
    new Set((members ?? []).map((m) => m.user_id as string)),
  );
  if (!ids.length) return [];

  const { data: users } = await db
    .from("users")
    .select("username, birthday")
    .in("id", ids);

  const now = new Date();
  const md = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  const today = md(now);
  const tomorrow = md(new Date(now.getTime() + 86400000));

  const result: { username: string; when: "today" | "tomorrow" }[] = [];
  for (const u of (users ?? []) as { username: string; birthday: string | null }[]) {
    if (!u.birthday) continue;
    const b = u.birthday.slice(5); // MM-DD
    if (b === today) result.push({ username: u.username, when: "today" });
    else if (b === tomorrow)
      result.push({ username: u.username, when: "tomorrow" });
  }
  return result;
}

/**
 * Returns true at most once per year, on the user's birthday - used to
 * show the "Happy Birthday" modal. Records a row so it does not repeat.
 */
export async function claimBirthdayModal(user: User): Promise<boolean> {
  if (!user.birthday) return false;
  const now = new Date();
  const md = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  if (user.birthday.slice(5) !== md) return false;

  const year = now.getFullYear();
  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("birthday_notifications")
    .select("id")
    .eq("user_id", user.id)
    .eq("birthday_user_id", user.id)
    .eq("year", year)
    .eq("type", "modal")
    .maybeSingle();
  if (existing) return false;

  await db.from("birthday_notifications").insert({
    user_id: user.id,
    birthday_user_id: user.id,
    year,
    type: "modal",
  });
  return true;
}
