import { create } from "zustand";
import type { Task } from "@/types/task";

interface TaskModalState {
  open: boolean;
  editing: Task | null;
  defaultListId: string | null;
  openCreate: (listId?: string) => void;
  openEdit: (task: Task) => void;
  close: () => void;
}

export const useTaskModal = create<TaskModalState>((set) => ({
  open: false,
  editing: null,
  defaultListId: null,
  openCreate: (listId) =>
    set({ open: true, editing: null, defaultListId: listId ?? null }),
  openEdit: (task) => set({ open: true, editing: task, defaultListId: null }),
  close: () => set({ open: false, editing: null, defaultListId: null }),
}));

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUi = create<UiState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));

interface ListCollapseState {
  collapsed: Record<string, boolean>;
  toggle: (listId: string) => void;
}

export const useListCollapse = create<ListCollapseState>((set) => ({
  collapsed: {},
  toggle: (listId) =>
    set((s) => ({
      collapsed: { ...s.collapsed, [listId]: !s.collapsed[listId] },
    })),
}));
