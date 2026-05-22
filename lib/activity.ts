import { supabaseAdmin } from "@/lib/supabase/admin";

export type ActivityAction =
  | "task_created"
  | "task_updated"
  | "task_moved"
  | "task_status_changed"
  | "task_assigned"
  | "task_archived"
  | "task_deleted"
  | "list_created"
  | "list_reordered"
  | "list_archived"
  | "team_created"
  | "team_member_added"
  | "team_member_removed"
  | "team_archived";

export async function logActivity(input: {
  action: ActivityAction;
  userId?: string | null;
  teamId?: string | null;
  taskId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}): Promise<void> {
  await supabaseAdmin()
    .from("activity_logs")
    .insert({
      action: input.action,
      user_id: input.userId ?? null,
      team_id: input.teamId ?? null,
      task_id: input.taskId ?? null,
      old_value: input.oldValue ?? null,
      new_value: input.newValue ?? null,
    });
}
