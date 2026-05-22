"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useTaskModal, useListCollapse } from "@/lib/stores";
import { useToday } from "@/components/today-context";
import { confirmDialog, promptDialog } from "@/components/ui/dialog";
import { sortTasks } from "@/lib/sort";
import { filterByDone, type DoneFilter } from "@/lib/view-filter";
import { moveTaskToList } from "@/server/actions/tasks";
import {
  createList,
  renameList,
  reorderLists,
  setListArchived,
} from "@/server/actions/lists";
import { TaskCard } from "@/components/tasks/task-card";
import {
  IconPlus,
  IconArchive,
  IconEdit,
  IconChevron,
} from "@/components/icons";
import type { List } from "@/types/list";
import type { TaskWithMeta } from "@/types/task";

export function ListBoard({
  personalLists,
  teamLists,
  tasks,
  filter,
  teamId,
  showTeam = true,
  showPersonal = true,
}: {
  personalLists: List[];
  teamLists: List[];
  tasks: TaskWithMeta[];
  filter: DoneFilter;
  teamId?: string;
  showTeam?: boolean;
  showPersonal?: boolean;
}) {
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const [personal, setPersonal] = useState(personalLists);
  const [team, setTeam] = useState(teamLists);
  const [taskMap, setTaskMap] = useState<Record<string, string>>({});
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => setPersonal(personalLists), [personalLists]);
  useEffect(() => setTeam(teamLists), [teamLists]);
  useEffect(() => {
    setTaskMap(Object.fromEntries(tasks.map((t) => [t.id, t.list_id])));
  }, [tasks]);

  const visibleTasks = useMemo(
    () => filterByDone(tasks, filter),
    [tasks, filter],
  );

  const byList = useMemo(() => {
    const map: Record<string, TaskWithMeta[]> = {};
    for (const t of visibleTasks) {
      const lid = taskMap[t.id] ?? t.list_id;
      (map[lid] ??= []).push({ ...t, list_id: lid });
    }
    return map;
  }, [visibleTasks, taskMap]);

  function onDragStart(e: DragStartEvent) {
    setDragId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setDragId(null);
    const active = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    if (!over) return;

    if (active.startsWith("t:")) {
      const taskId = active.slice(2);
      const targetList = over.startsWith("d:") ? over.slice(2) : null;
      if (!targetList || taskMap[taskId] === targetList) return;
      setTaskMap((m) => ({ ...m, [taskId]: targetList }));
      void moveTaskToList(taskId, targetList).then(() => router.refresh());
      return;
    }

    // list reorder
    const inPersonal = personal.some((l) => l.id === active);
    const cols = inPersonal ? personal : team;
    const setter = inPersonal ? setPersonal : setTeam;
    const from = cols.findIndex((l) => l.id === active);
    const to = cols.findIndex((l) => l.id === over);
    if (from === -1 || to === -1 || from === to) return;
    const next = arrayMove(cols, from, to);
    setter(next);
    void reorderLists(next.map((l) => l.id)).then(() => router.refresh());
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div
        className={clsx(
          "grid gap-4",
          showTeam && showPersonal ? "lg:grid-cols-2" : "grid-cols-1",
        )}
      >
        {showTeam && (
          <Column
            title="Team lists"
            lists={team}
            byList={byList}
            canCreate={!!teamId}
            onCreate={(name) => createList(name, "team", teamId)}
            router={router}
          />
        )}
        {showPersonal && (
          <Column
            title="Personal lists"
            lists={personal}
            byList={byList}
            canCreate
            onCreate={(name) => createList(name, "personal")}
            router={router}
          />
        )}
      </div>
      <DragOverlay>
        {dragId?.startsWith("t:") ? (
          <div className="rounded-lg border bg-surface p-3 text-sm shadow-lg">
            {tasks.find((t) => t.id === dragId.slice(2))?.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  title,
  lists,
  byList,
  canCreate,
  onCreate,
  router,
}: {
  title: string;
  lists: List[];
  byList: Record<string, TaskWithMeta[]>;
  canCreate: boolean;
  onCreate: (name: string) => Promise<{ error?: string }>;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">{title}</h2>
      </div>
      <SortableContext
        items={lists.map((l) => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {lists.map((l) => (
            <ListCard
              key={l.id}
              list={l}
              tasks={byList[l.id] ?? []}
              router={router}
            />
          ))}
        </div>
      </SortableContext>
      {canCreate ? (
        <NewListInput onCreate={onCreate} router={router} />
      ) : (
        <p className="text-xs text-muted">
          Create or join a team to add team lists.
        </p>
      )}
    </div>
  );
}

function ListCard({
  list,
  tasks,
  router,
}: {
  list: List;
  tasks: TaskWithMeta[];
  router: ReturnType<typeof useRouter>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: list.id });
  const { setNodeRef: dropRef, isOver } = useDroppable({ id: `d:${list.id}` });
  const openCreate = useTaskModal((s) => s.openCreate);
  const today = useToday();
  const collapsed = useListCollapse((s) => s.collapsed[list.id] ?? false);
  const toggleCollapse = useListCollapse((s) => s.toggle);
  const [, start] = useTransition();

  async function rename() {
    const name = await promptDialog({
      title: "Rename list",
      defaultValue: list.name,
      placeholder: "List name",
      confirmLabel: "Rename",
    });
    if (name && name !== list.name)
      start(async () => {
        await renameList(list.id, name);
        router.refresh();
      });
  }

  async function archive() {
    const ok = await confirmDialog({
      title: "Archive list",
      message: `Archive "${list.name}"? You can restore or delete it from the Archive page.`,
      confirmLabel: "Archive",
    });
    if (ok)
      start(async () => {
        await setListArchived(list.id, true);
        router.refresh();
      });
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx("card", isDragging && "opacity-50")}
    >
      <div
        className={clsx(
          "flex items-center gap-2 p-3",
          !collapsed && "border-b",
        )}
      >
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted"
          title="Drag to reorder"
        >
          ⋮⋮
        </span>
        <button
          onClick={() => toggleCollapse(list.id)}
          className="rounded p-0.5 text-muted hover:bg-surface-2"
          title={collapsed ? "Expand list" : "Collapse list"}
        >
          <IconChevron
            className={clsx(
              "h-4 w-4 transition-transform",
              !collapsed && "rotate-90",
            )}
          />
        </button>
        <button
          onClick={() => toggleCollapse(list.id)}
          className="flex-1 truncate text-left text-sm font-semibold"
        >
          {list.name}
        </button>
        <span className="chip bg-surface-2 text-muted">{tasks.length}</span>
        <button
          onClick={() => openCreate(list.id)}
          className="rounded p-1 text-muted hover:bg-surface-2"
          title="Add task"
        >
          <IconPlus className="h-4 w-4" />
        </button>
        <button
          onClick={rename}
          className="rounded p-1 text-muted hover:bg-surface-2"
          title="Rename list"
        >
          <IconEdit className="h-4 w-4" />
        </button>
        <button
          onClick={archive}
          className="rounded p-1 text-muted hover:bg-surface-2"
          title="Archive list"
        >
          <IconArchive className="h-4 w-4" />
        </button>
      </div>
      {!collapsed && (
        <div
          ref={dropRef}
          className={clsx(
            "min-h-[60px] space-y-2 p-3",
            isOver && "bg-primary/5",
          )}
        >
          {tasks.length === 0 && (
            <p className="py-2 text-center text-xs text-muted">
              Drop tasks here or add one.
            </p>
          )}
          {sortTasks(tasks, today).map((t) => (
            <DraggableTask key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function DraggableTask({ task }: { task: TaskWithMeta }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `t:${task.id}`,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={clsx("touch-none", isDragging && "opacity-40")}
    >
      <TaskCard task={task} showList={false} />
    </div>
  );
}

function NewListInput({
  onCreate,
  router,
}: {
  onCreate: (name: string) => Promise<{ error?: string }>;
  router: ReturnType<typeof useRouter>;
}) {
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        start(async () => {
          await onCreate(name.trim());
          setName("");
          router.refresh();
        });
      }}
      className="flex gap-2"
    >
      <input
        className="input"
        placeholder="New list name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button className="btn-ghost" disabled={pending}>
        Add
      </button>
    </form>
  );
}
