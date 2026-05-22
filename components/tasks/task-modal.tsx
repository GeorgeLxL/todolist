"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { useTaskModal } from "@/lib/stores";
import { createTask, updateTask, type TaskInput } from "@/server/actions/tasks";
import type { List } from "@/types/list";
import type { TeamDetail } from "@/server/queries";
import type { RepeatType } from "@/types/task";

export function TaskModal({
  lists,
  teams,
}: {
  lists: List[];
  teams: TeamDetail[];
}) {
  const { open, editing, defaultListId, close } = useTaskModal();
  if (!open) return null;
  return (
    <Modal
      title={editing ? "Edit task" : "New task"}
      onClose={close}
      wide
    >
      <TaskForm
        key={editing?.id ?? "new"}
        lists={lists}
        teams={teams}
        editing={editing}
        defaultListId={defaultListId}
        onDone={close}
      />
    </Modal>
  );
}

function TaskForm({
  lists,
  teams,
  editing,
  defaultListId,
  onDone,
}: {
  lists: List[];
  teams: TeamDetail[];
  editing: ReturnType<typeof useTaskModal.getState>["editing"];
  defaultListId: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const [listId, setListId] = useState(
    editing?.list_id ?? defaultListId ?? lists[0]?.id ?? "",
  );
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [date, setDate] = useState(editing?.date ?? "");
  const [time, setTime] = useState(editing?.time?.slice(0, 5) ?? "");
  const [dueDate, setDueDate] = useState(editing?.due_date ?? "");
  const [endDate, setEndDate] = useState(editing?.end_date ?? "");
  const [isUrgent, setIsUrgent] = useState(editing?.is_urgent ?? false);
  const [isImportant, setIsImportant] = useState(
    editing?.is_important ?? false,
  );
  const [notify, setNotify] = useState(editing?.notify ?? true);
  const [repeatType, setRepeatType] = useState<RepeatType>(
    editing?.repeat_type ?? "none",
  );
  const [repeatInterval, setRepeatInterval] = useState(
    editing?.repeat_interval ?? 1,
  );
  const [repeatUntil, setRepeatUntil] = useState(editing?.repeat_until ?? "");
  const [assignee, setAssignee] = useState(editing?.user_id ?? "");

  const selectedList = lists.find((l) => l.id === listId);
  const team =
    selectedList?.type === "team"
      ? teams.find((t) => t.id === selectedList.team_id)
      : undefined;

  function submit() {
    setError("");
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }
    if (!listId) {
      setError("Pick a list first - create one from List View.");
      return;
    }
    const input: TaskInput = {
      list_id: listId,
      title,
      description: description || null,
      date: date || null,
      time: time || null,
      due_date: dueDate || null,
      end_date: endDate || null,
      is_urgent: isUrgent,
      is_important: isImportant,
      notify,
      repeat_type: repeatType,
      repeat_interval: repeatInterval,
      repeat_until: repeatUntil || null,
      user_id: team ? assignee || null : undefined,
    };
    start(async () => {
      const res = editing
        ? await updateTask(editing.id, input)
        : await createTask(input);
      if (res?.error) setError(res.error);
      else {
        router.refresh();
        onDone();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">
          Title
        </label>
        <input
          className="input"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted">
          Description
        </label>
        <textarea
          className="input min-h-[64px] resize-y"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            List
          </label>
          <select
            className="input"
            value={listId}
            onChange={(e) => setListId(e.target.value)}
          >
            {lists.length === 0 && <option value="">No lists yet</option>}
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.type === "team" ? "Team" : "Personal"} · {l.name}
              </option>
            ))}
          </select>
        </div>
        {team && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Assignee
            </label>
            <select
              className="input"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="">Unassigned</option>
              {team.members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.username}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Date
          </label>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Time
          </label>
          <input
            type="time"
            className="input"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Due date
          </label>
          <input
            type="date"
            className="input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            End date
          </label>
          <input
            type="date"
            className="input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Repeat
          </label>
          <select
            className="input"
            value={repeatType}
            onChange={(e) => setRepeatType(e.target.value as RepeatType)}
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        {repeatType === "custom" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Every N days
            </label>
            <input
              type="number"
              min={1}
              className="input"
              value={repeatInterval}
              onChange={(e) =>
                setRepeatInterval(Math.max(1, Number(e.target.value)))
              }
            />
          </div>
        )}
        {repeatType !== "none" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Repeat until
            </label>
            <input
              type="date"
              className="input"
              value={repeatUntil}
              onChange={(e) => setRepeatUntil(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 pt-1">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isUrgent}
            onChange={(e) => setIsUrgent(e.target.checked)}
          />
          Urgent
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isImportant}
            onChange={(e) => setIsImportant(e.target.checked)}
          />
          Important
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
          />
          Notify (10 min before)
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <button className="btn-primary" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Create task"}
        </button>
      </div>
    </div>
  );
}
