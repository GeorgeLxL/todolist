"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/current-user";
import { isTeamAdmin } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

type Result = { error?: string };

export async function createTeam(name: string): Promise<Result> {
  const user = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Team name is required." };

  const db = supabaseAdmin();
  const { data: team, error } = await db
    .from("teams")
    .insert({ name: trimmed, admin_user_id: user.id })
    .select("id")
    .single();
  if (error || !team) return { error: "Could not create the team." };

  await db
    .from("team_members")
    .insert({ team_id: team.id, user_id: user.id });

  await logActivity({
    action: "team_created",
    userId: user.id,
    teamId: team.id,
  });
  revalidatePath("/", "layout");
  return {};
}

export async function renameTeam(
  teamId: string,
  name: string,
): Promise<Result> {
  const user = await requireUser();
  if (!(await isTeamAdmin(teamId, user.id)))
    return { error: "Only the team admin can do that." };
  const trimmed = name.trim();
  if (!trimmed) return { error: "Team name is required." };

  await supabaseAdmin().from("teams").update({ name: trimmed }).eq("id", teamId);
  revalidatePath("/", "layout");
  return {};
}

export async function addMember(
  teamId: string,
  username: string,
): Promise<Result> {
  const user = await requireUser();
  if (!(await isTeamAdmin(teamId, user.id)))
    return { error: "Only the team admin can add members." };

  const db = supabaseAdmin();
  const { data: target } = await db
    .from("users")
    .select("id")
    .eq("username", username.trim())
    .maybeSingle();
  if (!target) return { error: "No user found with that username." };

  const { data: existing } = await db
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", target.id)
    .maybeSingle();
  if (existing) return { error: "That user is already on the team." };

  await db
    .from("team_members")
    .insert({ team_id: teamId, user_id: target.id });
  await logActivity({
    action: "team_member_added",
    userId: user.id,
    teamId,
    newValue: { user_id: target.id },
  });
  revalidatePath("/", "layout");
  return {};
}

export async function removeMember(
  teamId: string,
  memberUserId: string,
): Promise<Result> {
  const user = await requireUser();
  if (!(await isTeamAdmin(teamId, user.id)))
    return { error: "Only the team admin can remove members." };

  const db = supabaseAdmin();
  const { data: team } = await db
    .from("teams")
    .select("admin_user_id")
    .eq("id", teamId)
    .maybeSingle();
  if (team?.admin_user_id === memberUserId)
    return { error: "The team admin cannot be removed." };

  await db
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", memberUserId);
  await logActivity({
    action: "team_member_removed",
    userId: user.id,
    teamId,
    oldValue: { user_id: memberUserId },
  });
  revalidatePath("/", "layout");
  return {};
}

export async function setTeamArchived(
  teamId: string,
  archived: boolean,
): Promise<Result> {
  const user = await requireUser();
  if (!(await isTeamAdmin(teamId, user.id)))
    return { error: "Only the team admin can archive the team." };

  await supabaseAdmin()
    .from("teams")
    .update({
      is_archived: archived,
      archived_at: archived ? new Date().toISOString() : null,
    })
    .eq("id", teamId);
  await logActivity({
    action: "team_archived",
    userId: user.id,
    teamId,
  });
  revalidatePath("/", "layout");
  return {};
}

export async function deleteTeam(teamId: string): Promise<Result> {
  const user = await requireUser();
  if (!(await isTeamAdmin(teamId, user.id)))
    return { error: "Only the team admin can delete the team." };

  const db = supabaseAdmin();
  const { data: team } = await db
    .from("teams")
    .select("is_archived")
    .eq("id", teamId)
    .maybeSingle();
  if (!team) return { error: "Team not found." };
  if (!team.is_archived)
    return { error: "Archive the team before deleting it permanently." };

  await db.from("teams").delete().eq("id", teamId);
  revalidatePath("/", "layout");
  return {};
}
