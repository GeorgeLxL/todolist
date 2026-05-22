-- =============================================================
-- TodoList - database schema
-- Custom auth: Supabase Auth is NOT used. The `users` table
-- holds credentials (password_hash). All server access uses the
-- service_role key, which bypasses RLS.
--
-- RLS is ENABLED on every table with NO public policies, so the
-- anon key (shipped to the browser) cannot read or write any
-- row directly - notably it cannot dump password hashes.
-- =============================================================

create extension if not exists "pgcrypto";

-- ---- shared updated_at trigger -------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---- users ---------------------------------------------------
create table if not exists users (
  id                    uuid primary key default gen_random_uuid(),
  username              text unique not null,
  password_hash         text not null,
  birthday              date,
  theme                 text not null default 'light',
  timezone              text not null default 'Asia/Tokyo',
  force_password_change boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger trg_users_updated before update on users
  for each row execute function set_updated_at();

-- ---- sessions (opaque token cookie auth) ---------------------
create table if not exists sessions (
  id         uuid primary key default gen_random_uuid(),
  token      text unique not null,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists idx_sessions_token on sessions(token);
create index if not exists idx_sessions_user  on sessions(user_id);

-- ---- teams ---------------------------------------------------
create table if not exists teams (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  admin_user_id uuid not null references users(id),
  timezone      text not null default 'Asia/Tokyo',
  is_archived   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  archived_at   timestamptz,
  deleted_at    timestamptz
);
create trigger trg_teams_updated before update on teams
  for each row execute function set_updated_at();

-- ---- team_members --------------------------------------------
create table if not exists team_members (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);
create index if not exists idx_team_members_team on team_members(team_id);
create index if not exists idx_team_members_user on team_members(user_id);

-- ---- lists (personal + team in one table) --------------------
create table if not exists lists (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null check (type in ('personal','team')),
  user_id     uuid references users(id) on delete cascade,
  team_id     uuid references teams(id) on delete cascade,
  sort_order  int not null default 0,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at  timestamptz,
  constraint lists_owner_chk check (
    (type = 'personal' and user_id is not null and team_id is null) or
    (type = 'team'     and team_id is not null and user_id is null)
  )
);
create index if not exists idx_lists_user on lists(user_id);
create index if not exists idx_lists_team on lists(team_id);
create trigger trg_lists_updated before update on lists
  for each row execute function set_updated_at();

-- ---- tasks ---------------------------------------------------
create table if not exists tasks (
  id                uuid primary key default gen_random_uuid(),
  list_id           uuid not null references lists(id) on delete cascade,
  type              text not null check (type in ('personal','team')),
  team_id           uuid references teams(id) on delete cascade,
  user_id           uuid references users(id) on delete set null,  -- personal: owner / team: assignee
  title             text not null,
  description       text,
  date              date,
  time              time,
  due_date          date,
  end_date          date,
  timezone          text,
  status            text not null default 'todo'
                       check (status in ('todo','progress','review','done')),
  is_recurring      boolean not null default false,
  repeat_type       text not null default 'none'
                       check (repeat_type in ('none','daily','weekly','monthly',
                                              'workdays','weekends','custom')),
  repeat_interval   int not null default 1,           -- "every N" for custom
  repeat_until      date,
  is_done_today     boolean not null default false,
  done_today_date   date,                             -- day is_done_today refers to (lazy reset)
  is_fully_complete boolean not null default false,
  is_important      boolean not null default false,
  is_urgent         boolean not null default false,
  notify            boolean not null default true,
  is_archived       boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  archived_at       timestamptz,
  deleted_at        timestamptz
);
create index if not exists idx_tasks_list on tasks(list_id);
create index if not exists idx_tasks_team on tasks(team_id);
create index if not exists idx_tasks_user on tasks(user_id);
create index if not exists idx_tasks_date on tasks(date);
create trigger trg_tasks_updated before update on tasks
  for each row execute function set_updated_at();

-- ---- task_occurrences (recurring task instances) -------------
create table if not exists task_occurrences (
  id              uuid primary key default gen_random_uuid(),
  task_id         uuid not null references tasks(id) on delete cascade,
  occurrence_date date not null,
  is_done         boolean not null default false,
  done_at         timestamptz,
  created_at      timestamptz not null default now(),
  unique (task_id, occurrence_date)
);
create index if not exists idx_occ_task on task_occurrences(task_id);

-- ---- activity_logs -------------------------------------------
create table if not exists activity_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id) on delete set null,
  team_id    uuid references teams(id) on delete cascade,
  task_id    uuid references tasks(id) on delete set null,
  action     text not null,
  old_value  jsonb,
  new_value  jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_logs_team on activity_logs(team_id);
create index if not exists idx_logs_task on activity_logs(task_id);

-- ---- birthday_notifications ----------------------------------
create table if not exists birthday_notifications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id) on delete cascade,
  birthday_user_id uuid not null references users(id) on delete cascade,
  year             int  not null,
  type             text not null check (type in ('today','tomorrow','modal')),
  shown_at         timestamptz not null default now(),
  unique (user_id, birthday_user_id, year, type)
);

-- ---- Row Level Security --------------------------------------
-- Enable RLS everywhere; add NO policies. The service_role key
-- used by the Next.js server bypasses RLS. The anon key cannot
-- touch any table, which is the desired lockdown.
alter table users                  enable row level security;
alter table sessions               enable row level security;
alter table teams                  enable row level security;
alter table team_members           enable row level security;
alter table lists                  enable row level security;
alter table tasks                  enable row level security;
alter table task_occurrences       enable row level security;
alter table activity_logs          enable row level security;
alter table birthday_notifications enable row level security;
