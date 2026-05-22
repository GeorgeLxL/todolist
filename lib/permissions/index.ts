import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Team ids the user belongs to. Deduped per request. */
export const getUserTeamIds = cache(async function getUserTeamIds(
  userId: string,
): Promise<string[]> {
  const { data } = await supabaseAdmin()
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId);
  return (data ?? []).map((r) => r.team_id as string);
});

export async function isTeamMember(
  teamId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function isTeamAdmin(
  teamId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from("teams")
    .select("admin_user_id")
    .eq("id", teamId)
    .maybeSingle();
  return data?.admin_user_id === userId;
}

/** Whether a user may read/write a given list. */
export async function canAccessList(
  list: { type: string; user_id: string | null; team_id: string | null },
  userId: string,
): Promise<boolean> {
  if (list.type === "personal") return list.user_id === userId;
  if (list.team_id) return isTeamMember(list.team_id, userId);
  return false;
}
