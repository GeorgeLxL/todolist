"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/current-user";
import { isTeamMember } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { todayInTz } from "@/lib/date-time";
import type { Task, TaskStatus, RepeatType } from "@/types/task";

type Result = { error?: string };

export interface TaskInput {
  list_id: string;
  title: string;
  description?: string | null;
  date?: string | null;
  time?: string | null;
  due_date?: string | null;
  end_date?: string | null;
  status?: TaskStatus;
  is_recurring?: boolean;
  repeat_type?: RepeatType;
  repeat_interval?: number;
  repeat_until?: string | null;
  is_important?: boolean;
  is_urgent?: boolean;
  notify?: boolean;
  user_id?: string | null;
}

/** Load a task the current user is allowed to see/edit. */
async function loadTask(
  taskId: string,
  userId: string,
): Promise<Task | null> {
  const { data: task } = await supabaseAdmin()
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return null;
  if (task.type === "personal") return task.user_id === userId ? (task as Task) : null;
  if (task.team_id && (await isTeamMember(task.team_id, userId)))
    return task as Task;
  return null;
}

export async function createTask(input: TaskInput): Promise<Result> {
  const user = await requireUser();
  const title = input.title.trim();
  if (!title) return { error: "Task title is required." };

  const db = supabaseAdmin();
  const { data: list } = await db
    .from("lists")
    .select("id, type, user_id, team_id")
    .eq("id", input.list_id)
    .maybeSingle();
  if (!list) return { error: "List not found." };

  const isTeam = list.type === "team";
  if (isTeam) {
    if (!(await isTeamMember(list.team_id as string, user.id)))
      return { error: "You are not a member of this team." };
  } else if (list.user_id !== user.id) {
    return { error: "You cannot add tasks to this list." };
  }

  let timezone = user.timezone;
  if (isTeam) {
    const { data: team } = await db
      .from("teams")
      .select("timezone")
      .eq("id", list.team_id as string)
      .maybeSingle();
    timezone = (team?.timezone as string) ?? "Asia/Tokyo";
  }

  const repeatType = input.repeat_type ?? "none";
  const isRecurring = repeatType !== "none";

  // A recurring task always needs a date so it shows in date-based views;
  // default it to today (in the task's timezone) when none was chosen.
  let date = input.date || null;
  if (isRecurring && !date) date = todayInTz(timezone);

  const { data: created } = await db
    .from("tasks")
    .insert({
      list_id: list.id,
      type: list.type,
      team_id: isTeam ? list.team_id : null,
      user_id: isTeam ? input.user_id ?? null : user.id,
      title,
      description: input.description ?? null,
      date,
      time: input.time || null,
      due_date: input.due_date || null,
      end_date: input.end_date || null,
      timezone,
      status: input.status ?? "todo",
      is_recurring: isRecurring,
      repeat_type: repeatType,
      repeat_interval: input.repeat_interval ?? 1,
      repeat_until: input.repeat_until || null,
      is_important: input.is_important ?? false,
      is_urgent: input.is_urgent ?? false,
      notify: input.notify ?? true,
    })
    .select("id")
    .single();

  await logActivity({
    action: "task_created",
    userId: user.id,
    teamId: isTeam ? (list.team_id as string) : null,
    taskId: created?.id,
    newValue: { title },
  });
  revalidatePath("/", "layout");
  return {};
}

export async function updateTask(
  id: string,
  patch: Partial<TaskInput>,
): Promise<Result> {
  const user = await requireUser();
  const task = await loadTask(id, user.id);
  if (!task) return { error: "Task not found." };

  const title = patch.title !== undefined ? patch.title.trim() : undefined;
  if (title !== undefined && !title)
    return { error: "Task title is required." };

  const repeatType = patch.repeat_type;
  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.date !== undefined) update.date = patch.date || null;
  if (patch.time !== undefined) update.time = patch.time || null;
  if (patch.due_date !== undefined) update.due_date = patch.due_date || null;
  if (patch.end_date !== undefined) update.end_date = patch.end_date || null;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.is_important !== undefined) update.is_important = patch.is_important;
  if (patch.is_urgent !== undefined) update.is_urgent = patch.is_urgent;
  if (patch.notify !== undefined) update.notify = patch.notify;
  if (patch.user_id !== undefined && task.type === "team")
    update.user_id = patch.user_id;
  if (repeatType !== undefined) {
    update.repeat_type = repeatType;
    update.is_recurring = repeatType !== "none";
  }
  if (patch.repeat_interval !== undefined)
    update.repeat_interval = patch.repeat_interval;
  if (patch.repeat_until !== undefined)
    update.repeat_until = patch.repeat_until || null;

  // Keep recurring tasks dated so they stay visible in date-based views.
  const resultingRecurring =
    repeatType !== undefined ? repeatType !== "none" : task.is_recurring;
  const resultingDate =
    patch.date !== undefined ? patch.date || null : task.date;
  if (resultingRecurring && !resultingDate) {
    update.date = todayInTz(task.timezone ?? user.timezone);
  }

  await supabaseAdmin().from("tasks").update(update).eq("id", id);
  await logActivity({
    action: "task_updated",
    userId: user.id,
    teamId: task.team_id,
    taskId: id,
    oldValue: { title: task.title },
    newValue: update,
  });
  revalidatePath("/", "layout");
  return {};
}

export async function moveTaskToList(
  id: string,
  listId: string,
): Promise<Result> {
  const user = await requireUser();
  const task = await loadTask(id, user.id);
  if (!task) return { error: "Task not found." };

  const db = supabaseAdmin();
  const { data: list } = await db
    .from("lists")
    .select("type, user_id, team_id")
    .eq("id", listId)
    .maybeSingle();
  if (!list) return { error: "List not found." };
  if (list.type !== task.type)
    return { error: "Cannot move a task between personal and team lists." };
  if (task.type === "personal" && list.user_id !== user.id)
    return { error: "You cannot move a task to that list." };
  if (task.type === "team" && list.team_id !== task.team_id)
    return { error: "Cannot move a task to another team." };

  await db.from("tasks").update({ list_id: listId }).eq("id", id);
  await logActivity({
    action: "task_moved",
    userId: user.id,
    teamId: task.team_id,
    taskId: id,
  });
  revalidatePath("/", "layout");
  return {};
}

export async function changeTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<Result> {
  const user = await requireUser();
  const task = await loadTask(id, user.id);
  if (!task) return { error: "Task not found." };

  const update: Record<string, unknown> = { status };
  if (status === "done") {
    update.is_fully_complete = true;
    if (!task.is_recurring) update.is_done_today = true;
  } else {
    update.is_fully_complete = false;
  }

  // For recurring tasks "done today" is the Progress column - keep the
  // is_done_today flag (which drives the checkbox) in sync with the status.
  if (task.is_recurring) {
    if (status === "progress") {
      update.is_done_today = true;
      update.done_today_date = todayInTz(task.timezone ?? user.timezone);
    } else if (status === "todo" || status === "review") {
      update.is_done_today = false;
    }
  }

  await supabaseAdmin().from("tasks").update(update).eq("id", id);
  await logActivity({
    action: "task_status_changed",
    userId: user.id,
    teamId: task.team_id,
    taskId: id,
    oldValue: { status: task.status },
    newValue: { status },
  });
  revalidatePath("/", "layout");
  return {};
}

export async function assignTask(
  id: string,
  assigneeId: string | null,
): Promise<Result> {
  const user = await requireUser();
  const task = await loadTask(id, user.id);
  if (!task) return { error: "Task not found." };
  if (task.type !== "team")
    return { error: "Only team tasks can be assigned." };
  if (assigneeId && !(await isTeamMember(task.team_id as string, assigneeId)))
    return { error: "That user is not on the team." };

  await supabaseAdmin().from("tasks").update({ user_id: assigneeId }).eq("id", id);
  await logActivity({
    action: "task_assigned",
    userId: user.id,
    teamId: task.team_id,
    taskId: id,
    oldValue: { user_id: task.user_id },
    newValue: { user_id: assigneeId },
  });
  revalidatePath("/", "layout");
  return {};
}

export async function setTaskPriority(
  id: string,
  isUrgent: boolean,
  isImportant: boolean,
): Promise<Result> {
  const user = await requireUser();
  const task = await loadTask(id, user.id);
  if (!task) return { error: "Task not found." };

  await supabaseAdmin()
    .from("tasks")
    .update({ is_urgent: isUrgent, is_important: isImportant })
    .eq("id", id);
  await logActivity({
    action: "task_updated",
    userId: user.id,
    teamId: task.team_id,
    taskId: id,
    newValue: { is_urgent: isUrgent, is_important: isImportant },
  });
  revalidatePath("/", "layout");
  return {};
}

export async function setTaskSchedule(
  id: string,
  date: string | null,
  time: string | null,
): Promise<Result> {
  const user = await requireUser();
  const task = await loadTask(id, user.id);
  if (!task) return { error: "Task not found." };

  await supabaseAdmin()
    .from("tasks")
    .update({ date: date || null, time: time || null })
    .eq("id", id);
  await logActivity({
    action: "task_updated",
    userId: user.id,
    teamId: task.team_id,
    taskId: id,
    newValue: { date, time },
  });
  revalidatePath("/", "layout");
  return {};
}

/** Non-recurring done checkbox. */
export async function toggleTaskDone(id: string): Promise<Result> {
  const user = await requireUser();
  const task = await loadTask(id, user.id);
  if (!task) return { error: "Task not found." };

  const done = task.is_fully_complete;
  await supabaseAdmin()
    .from("tasks")
    .update(
      done
        ? { status: "todo", is_done_today: false, is_fully_complete: false }
        : { status: "done", is_done_today: true, is_fully_complete: true },
    )
    .eq("id", id);
  revalidatePath("/", "layout");
  return {};
}

/** Recurring "Done today" checkbox. */
export async function markDoneToday(id: string): Promise<Result> {
  const user = await requireUser();
  const task = await loadTask(id, user.id);
  if (!task) return { error: "Task not found." };

  const today = todayInTz(task.timezone ?? user.timezone);
  const doneToday =
    task.is_done_today && task.done_today_date === today;

  const db = supabaseAdmin();
  if (doneToday) {
    await db
      .from("tasks")
      .update({ is_done_today: false, status: "todo" })
      .eq("id", id);
    await db
      .from("task_occurrences")
      .delete()
      .eq("task_id", id)
      .eq("occurrence_date", today);
  } else {
    await db
      .from("tasks")
      .update({
        is_done_today: true,
        done_today_date: today,
        status: "progress",
      })
      .eq("id", id);
    await db.from("task_occurrences").upsert(
      {
        task_id: id,
        occurrence_date: today,
        is_done: true,
        done_at: new Date().toISOString(),
      },
      { onConflict: "task_id,occurrence_date" },
    );
  }
  revalidatePath("/", "layout");
  return {};
}

/** Recurring "Complete" button - finishes the task forever. */
export async function completeRecurringTask(id: string): Promise<Result> {
  const user = await requireUser();
  const task = await loadTask(id, user.id);
  if (!task) return { error: "Task not found." };

  const fully = task.is_fully_complete;
  await supabaseAdmin()
    .from("tasks")
    .update(
      fully
        ? { is_fully_complete: false, status: "progress" }
        : { is_fully_complete: true, status: "done" },
    )
    .eq("id", id);
  revalidatePath("/", "layout");
  return {};
}

export async function setTaskArchived(
  id: string,
  archived: boolean,
): Promise<Result> {
  const user = await requireUser();
  const task = await loadTask(id, user.id);
  if (!task) return { error: "Task not found." };

  await supabaseAdmin()
    .from("tasks")
    .update({
      is_archived: archived,
      archived_at: archived ? new Date().toISOString() : null,
    })
    .eq("id", id);
  await logActivity({
    action: "task_archived",
    userId: user.id,
    teamId: task.team_id,
    taskId: id,
  });
  revalidatePath("/", "layout");
  return {};
}

export async function deleteTask(id: string): Promise<Result> {
  const user = await requireUser();
  const task = await loadTask(id, user.id);
  if (!task) return { error: "Task not found." };
  if (!task.is_archived)
    return { error: "Archive the task before deleting it permanently." };

  await supabaseAdmin().from("tasks").delete().eq("id", id);
  revalidatePath("/", "layout");
  return {};
}
