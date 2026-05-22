export interface Team {
  id: string;
  name: string;
  admin_user_id: string;
  timezone: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  created_at: string;
}

export interface TeamWithMembers extends Team {
  members: { id: string; user_id: string; username: string }[];
  is_admin: boolean;
}
