"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/current-user";
import { isTeamMember } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

type Result = { error?: string };

export async function createList(
  name: string,
  type: "personal" | "team",
  teamId?: string,
): Promise<Result> {
  const user = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return { error: "List name is required." };

  const db = supabaseAdmin();
  if (type === "team") {
    if (!teamId || !(await isTeamMember(teamId, user.id)))
      return { error: "You are not a member of this team." };
  }

  const { data: rows } = await db
    .from("lists")
    .select("sort_order")
    .eq(type === "team" ? "team_id" : "user_id", type === "team" ? teamId! : user.id);
  const max = (rows ?? []).reduce(
    (m, r) => Math.max(m, (r.sort_order as number) ?? 0),
    -1,
  );

  await db.from("lists").insert({
    name: trimmed,
    type,
    user_id: type === "personal" ? user.id : null,
    team_id: type === "team" ? teamId : null,
    sort_order: max + 1,
  });

  await logActivity({
    action: "list_created",
    userId: user.id,
    teamId: teamId ?? null,
  });
  revalidatePath("/", "layout");
  return {};
}

export async function renameList(id: string, name: string): Promise<Result> {
  const user = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return { error: "List name is required." };

  const db = supabaseAdmin();
  const { data: list } = await db
    .from("lists")
    .select("type, user_id, team_id")
    .eq("id", id)
    .maybeSingle();
  if (!list) return { error: "List not found." };
  if (!(await canEdit(list, user.id)))
    return { error: "You cannot edit this list." };

  await db.from("lists").update({ name: trimmed }).eq("id", id);
  revalidatePath("/", "layout");
  return {};
}

export async function reorderLists(orderedIds: string[]): Promise<Result> {
  const user = await requireUser();
  const db = supabaseAdmin();

  for (let i = 0; i < orderedIds.length; i++) {
    const { data: list } = await db
      .from("lists")
      .select("type, user_id, team_id")
      .eq("id", orderedIds[i])
      .maybeSingle();
    if (!list || !(await canEdit(list, user.id))) continue;
    await db.from("lists").update({ sort_order: i }).eq("id", orderedIds[i]);
  }

  await logActivity({ action: "list_reordered", userId: user.id });
  revalidatePath("/", "layout");
  return {};
}

export async function setListArchived(
  id: string,
  archived: boolean,
): Promise<Result> {
  const user = await requireUser();
  const db = supabaseAdmin();
  const { data: list } = await db
    .from("lists")
    .select("type, user_id, team_id")
    .eq("id", id)
    .maybeSingle();
  if (!list) return { error: "List not found." };
  if (!(await canEdit(list, user.id)))
    return { error: "You cannot edit this list." };

  await db
    .from("lists")
    .update({
      is_archived: archived,
      archived_at: archived ? new Date().toISOString() : null,
    })
    .eq("id", id);

  await logActivity({
    action: "list_archived",
    userId: user.id,
    teamId: list.team_id,
  });
  revalidatePath("/", "layout");
  return {};
}

export async function deleteList(id: string): Promise<Result> {
  const user = await requireUser();
  const db = supabaseAdmin();
  const { data: list } = await db
    .from("lists")
    .select("type, user_id, team_id, is_archived")
    .eq("id", id)
    .maybeSingle();
  if (!list) return { error: "List not found." };
  if (!(await canEdit(list, user.id)))
    return { error: "You cannot delete this list." };
  if (!list.is_archived)
    return { error: "Archive the list before deleting it permanently." };

  await db.from("lists").delete().eq("id", id);
  revalidatePath("/", "layout");
  return {};
}

async function canEdit(
  list: { type: string; user_id: string | null; team_id: string | null },
  userId: string,
): Promise<boolean> {
  if (list.type === "personal") return list.user_id === userId;
  if (list.team_id) return isTeamMember(list.team_id, userId);
  return false;
}
