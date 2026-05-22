"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import clsx from "clsx";
import { sortTasks } from "@/lib/sort";
import { filterByDone, type DoneFilter } from "@/lib/view-filter";
import { changeTaskStatus } from "@/server/actions/tasks";
import { TaskCard } from "@/components/tasks/task-card";
import { TASK_STATUSES, STATUS_LABEL, type TaskWithMeta, type TaskStatus } from "@/types/task";

export function KanbanBoard({
  tasks,
  filter,
}: {
  tasks: TaskWithMeta[];
  filter: DoneFilter;
}) {
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const [statusMap, setStatusMap] = useState<Record<string, TaskStatus>>({});
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    setStatusMap(Object.fromEntries(tasks.map((t) => [t.id, t.status])));
  }, [tasks]);

  const visible = useMemo(() => filterByDone(tasks, filter), [tasks, filter]);

  const columns = useMemo(() => {
    const map: Record<TaskStatus, TaskWithMeta[]> = {
      todo: [],
      progress: [],
      review: [],
      done: [],
    };
    for (const t of visible) {
      const st = statusMap[t.id] ?? t.status;
      map[st].push({ ...t, status: st });
    }
    return map;
  }, [visible, statusMap]);

  function onDragStart(e: DragStartEvent) {
    setDragId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setDragId(null);
    const taskId = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    if (!over || !over.startsWith("col:")) return;
    const status = over.slice(4) as TaskStatus;
    if ((statusMap[taskId] ?? "") === status) return;
    setStatusMap((m) => ({ ...m, [taskId]: status }));
    void changeTaskStatus(taskId, status).then(() => router.refresh());
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={sortTasks(columns[status])}
          />
        ))}
      </div>
      <DragOverlay>
        {dragId ? (
          <div className="rounded-lg border bg-surface p-3 text-sm shadow-lg">
            {tasks.find((t) => t.id === dragId)?.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  tasks,
}: {
  status: TaskStatus;
  tasks: TaskWithMeta[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex flex-col rounded-xl border bg-surface-2/50 p-2",
        isOver && "ring-2 ring-primary",
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">{STATUS_LABEL[status]}</h3>
        <span className="chip bg-surface-2 text-muted">{tasks.length}</span>
      </div>
      <div className="min-h-[120px] space-y-2">
        {tasks.map((t) => (
          <DraggableCard key={t.id} task={t} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ task }: { task: TaskWithMeta }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={clsx("touch-none", isDragging && "opacity-40")}
    >
      <TaskCard task={task} />
    </div>
  );
}
