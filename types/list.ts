export type ListType = "personal" | "team";

export interface List {
  id: string;
  name: string;
  type: ListType;
  user_id: string | null;
  team_id: string | null;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
}
