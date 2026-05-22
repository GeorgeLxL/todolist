"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import clsx from "clsx";
import { useTaskModal } from "@/lib/stores";
import { setTaskSchedule } from "@/server/actions/tasks";
import { sortTasks } from "@/lib/sort";
import { formatTime } from "@/lib/date-time";
import type { RangeFilter } from "@/lib/view-filter";
import type { TaskWithMeta } from "@/types/task";

export function CalendarView({
  tasks,
  range,
}: {
  tasks: TaskWithMeta[];
  range: RangeFilter;
}) {
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const [anchor, setAnchor] = useState(new Date());
  const [dateMap, setDateMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    setDateMap(Object.fromEntries(tasks.map((t) => [t.id, t.date])));
  }, [tasks]);

  const days = useMemo(() => {
    if (range === "day") return [anchor];
    if (range === "week") {
      const start = startOfWeek(anchor, { weekStartsOn: 0 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [anchor, range]);

  const byDate = useMemo(() => {
    const map: Record<string, TaskWithMeta[]> = {};
    for (const t of tasks) {
      const d = dateMap[t.id] ?? t.date;
      if (!d) continue;
      (map[d] ??= []).push({ ...t, date: d });
    }
    return map;
  }, [tasks, dateMap]);

  function shift(dir: number) {
    if (range === "day") setAnchor((a) => addDays(a, dir));
    else if (range === "week") setAnchor((a) => addWeeks(a, dir));
    else setAnchor((a) => addMonths(a, dir));
  }

  function onDragEnd(e: DragEndEvent) {
    const taskId = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    if (!over || !over.startsWith("day:")) return;
    const date = over.slice(4);
    if ((dateMap[taskId] ?? null) === date) return;
    setDateMap((m) => ({ ...m, [taskId]: date }));
    const time = tasks.find((t) => t.id === taskId)?.time ?? null;
    void setTaskSchedule(taskId, date, time).then(() => router.refresh());
  }

  const title =
    range === "month"
      ? format(anchor, "MMMM yyyy")
      : range === "week"
        ? `Week of ${format(startOfWeek(anchor, { weekStartsOn: 0 }), "MMM d, yyyy")}`
        : format(anchor, "EEEE, MMM d, yyyy");

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={onDragEnd}
    >
      <div className="mb-3 flex items-center gap-2">
        <button className="btn-ghost" onClick={() => shift(-1)}>
          ‹
        </button>
        <button className="btn-ghost" onClick={() => setAnchor(new Date())}>
          Today
        </button>
        <button className="btn-ghost" onClick={() => shift(1)}>
          ›
        </button>
        <h2 className="ml-2 text-sm font-semibold">{title}</h2>
      </div>

      {range === "day" ? (
        <DayCell
          day={anchor}
          tasks={byDate[format(anchor, "yyyy-MM-dd")] ?? []}
          tall
        />
      ) : (
        <>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => (
              <DayCell
                key={d.toISOString()}
                day={d}
                tasks={byDate[format(d, "yyyy-MM-dd")] ?? []}
                muted={range === "month" && !isSameMonth(d, anchor)}
                tall={range === "week"}
              />
            ))}
          </div>
        </>
      )}
    </DndContext>
  );
}

function DayCell({
  day,
  tasks,
  muted,
  tall,
}: {
  day: Date;
  tasks: TaskWithMeta[];
  muted?: boolean;
  tall?: boolean;
}) {
  const iso = format(day, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({ id: `day:${iso}` });
  const isToday = iso === format(new Date(), "yyyy-MM-dd");

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "rounded-lg border bg-surface p-1.5",
        tall ? "min-h-[160px]" : "min-h-[96px]",
        muted && "opacity-40",
        isOver && "ring-2 ring-primary",
      )}
    >
      <div
        className={clsx(
          "mb-1 text-xs font-medium",
          isToday && "inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-fg",
        )}
      >
        {format(day, "d")}
      </div>
      <div className="space-y-1">
        {sortTasks(tasks).map((t) => (
          <CalendarChip key={t.id} task={t} />
        ))}
      </div>
    </div>
  );
}

function CalendarChip({ task }: { task: TaskWithMeta }) {
  const openEdit = useTaskModal((s) => s.openEdit);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => openEdit(task)}
      className={clsx(
        "cursor-pointer touch-none truncate rounded px-1.5 py-1 text-xs",
        task.is_fully_complete
          ? "bg-surface-2 text-muted line-through"
          : task.is_urgent
            ? "bg-danger/15 text-danger"
            : "bg-primary/15 text-primary",
        isDragging && "opacity-40",
      )}
      title={task.title}
    >
      {task.time && (
        <span className="mr-1 font-medium">{formatTime(task.time)}</span>
      )}
      {task.title}
    </div>
  );
}
