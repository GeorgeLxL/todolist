-- Migration: consolidate the recurring-end value into due_date and drop
-- the redundant end_date / repeat_until columns.
-- Run once in the Supabase SQL editor.

-- Move any existing end_date / repeat_until value onto due_date for
-- recurring tasks that don't already have a due_date.
update tasks
   set due_date = coalesce(due_date, end_date, repeat_until)
 where is_recurring = true
   and due_date is null
   and (end_date is not null or repeat_until is not null);

alter table tasks drop column if exists end_date;
alter table tasks drop column if exists repeat_until;
