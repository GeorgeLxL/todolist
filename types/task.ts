export type TaskType = "personal" | "team";
export type TaskStatus = "todo" | "progress" | "review" | "done";
export type RepeatType =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "workdays"
  | "weekends"
  | "custom";

export const TASK_STATUSES: TaskStatus[] = ["todo", "progress", "review", "done"];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Todo",
  progress: "Progress",
  review: "Review",
  done: "Done",
};

export interface Task {
  id: string;
  list_id: string;
  type: TaskType;
  team_id: string | null;
  user_id: string | null;
  title: string;
  description: string | null;
  date: string | null;
  time: string | null;
  due_date: string | null;
  end_date: string | null;
  timezone: string | null;
  status: TaskStatus;
  is_recurring: boolean;
  repeat_type: RepeatType;
  repeat_interval: number;
  repeat_until: string | null;
  is_done_today: boolean;
  done_today_date: string | null;
  is_fully_complete: boolean;
  is_important: boolean;
  is_urgent: boolean;
  notify: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
}

export interface TaskWithMeta extends Task {
  list_name: string;
  assignee_username: string | null;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  team_id: string | null;
  task_id: string | null;
  action: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}
