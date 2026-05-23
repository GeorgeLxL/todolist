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
import { isDoneGrouped } from "@/lib/task-helpers";
import { useToday } from "@/components/today-context";
import { filterByDone, type DoneFilter } from "@/lib/view-filter";
import { setTaskPriority } from "@/server/actions/tasks";
import { TaskCard } from "@/components/tasks/task-card";
import { IconChevron } from "@/components/icons";
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
  const today = useToday();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const [quadMap, setQuadMap] = useState<Record<string, Quad>>({});
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    setQuadMap(Object.fromEntries(tasks.map((t) => [t.id, quadOf(t)])));
  }, [tasks]);

  const visible = useMemo(
    () => filterByDone(tasks, filter, today),
    [tasks, filter, today],
  );

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
            tasks={grouped[q.id]}
            filter={filter}
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
  filter,
}: {
  quad: (typeof QUADRANTS)[number];
  tasks: TaskWithMeta[];
  filter: DoneFilter;
}) {
  const today = useToday();
  const { setNodeRef, isOver } = useDroppable({ id: `q:${quad.id}` });
  const [doneOpen, setDoneOpen] = useState(false);

  const undone = tasks.filter((t) => !isDoneGrouped(t, today));
  const done = tasks.filter((t) => isDoneGrouped(t, today));

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
        {sortTasks(undone, today).map((t) => (
          <DraggableCard key={t.id} task={t} />
        ))}
        {filter === "done" &&
          sortTasks(done, today).map((t) => (
            <DraggableCard key={t.id} task={t} />
          ))}
        {filter === "all" && done.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => setDoneOpen((o) => !o)}
              className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-xs font-medium text-muted hover:bg-surface-2"
            >
              <IconChevron
                className={clsx(
                  "h-3.5 w-3.5 transition-transform",
                  doneOpen && "rotate-90",
                )}
              />
              <span>Done</span>
              <span className="chip bg-surface-2 text-muted">
                {done.length}
              </span>
            </button>
            {doneOpen && (
              <div className="mt-1 space-y-2">
                {sortTasks(done, today).map((t) => (
                  <DraggableCard key={t.id} task={t} />
                ))}
              </div>
            )}
          </div>
        )}
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
