-- Migration: add 'workdays' and 'weekends' recurring options.
-- Run this once in the Supabase SQL editor on a database that was
-- created with the original schema.sql.

alter table tasks drop constraint if exists tasks_repeat_type_check;

alter table tasks add constraint tasks_repeat_type_check
  check (repeat_type in ('none','daily','weekly','monthly',
                         'workdays','weekends','custom'));
