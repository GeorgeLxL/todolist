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
import { setTaskPriority } from "@/server/actions/tasks";
import { TaskCard } from "@/components/tasks/task-card";
import type { TaskWithMeta } from "@/types/task";

type Quad = "ui" | "u" | "i" | "n";

const QUADRANTS: { id: Quad; label: string; hint: string; tone: string }[] = [
  { id: "ui", label: "Urgent + Important", hint: "Do first", tone: "text-danger" },
  { id: "u", label: "Urgent", hint: "Schedule soon", tone: "text-warning" },
  { id: "i", label: "Important", hint: "Plan", tone: "text-accent" },
  { id: "n", label: "Normal", hint: "Someday", tone: "text-muted" },
];

function quadOf(t: { is_urgent: boolean; is_important: boolean }): Quad {
  if (t.is_urgent && t.is_important) return "ui";
  if (t.is_urgent) return "u";
  if (t.is_important) return "i";
  return "n";
}

const FLAGS: Record<Quad, { is_urgent: boolean; is_important: boolean }> = {
  ui: { is_urgent: true, is_important: true },
  u: { is_urgent: true, is_important: false },
  i: { is_urgent: false, is_important: true },
  n: { is_urgent: false, is_important: false },
};

export function PriorityMatrix({
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
  const [quadMap, setQuadMap] = useState<Record<string, Quad>>({});
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    setQuadMap(Object.fromEntries(tasks.map((t) => [t.id, quadOf(t)])));
  }, [tasks]);

  const visible = useMemo(() => filterByDone(tasks, filter), [tasks, filter]);

  const grouped = useMemo(() => {
    const map: Record<Quad, TaskWithMeta[]> = { ui: [], u: [], i: [], n: [] };
    for (const t of visible) {
      const q = quadMap[t.id] ?? quadOf(t);
      map[q].push({ ...t, ...FLAGS[q] });
    }
    return map;
  }, [visible, quadMap]);

  function onDragEnd(e: DragEndEvent) {
    setDragId(null);
    const taskId = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    if (!over || !over.startsWith("q:")) return;
    const q = over.slice(2) as Quad;
    if ((quadMap[taskId] ?? "n") === q) return;
    setQuadMap((m) => ({ ...m, [taskId]: q }));
    void setTaskPriority(taskId, FLAGS[q].is_urgent, FLAGS[q].is_important).then(
      () => router.refresh(),
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={(e: DragStartEvent) => setDragId(String(e.active.id))}
      onDragEnd={onDragEnd}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {QUADRANTS.map((q) => (
          <Quadrant
            key={q.id}
            quad={q}
            tasks={sortTasks(grouped[q.id])}
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

function Quadrant({
  quad,
  tasks,
}: {
  quad: (typeof QUADRANTS)[number];
  tasks: TaskWithMeta[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `q:${quad.id}` });
  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex min-h-[200px] flex-col rounded-xl border bg-surface-2/50 p-3",
        isOver && "ring-2 ring-primary",
      )}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className={clsx("text-sm font-semibold", quad.tone)}>
          {quad.label}
        </h3>
        <span className="text-xs text-muted">{quad.hint}</span>
      </div>
      <div className="space-y-2">
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
