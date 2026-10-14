-- Project keys can be letters, numbers, and hyphens, up to 80 characters.
-- Existing keys already match this pattern.

alter table public.projects drop constraint projects_key_check;

alter table public.projects add constraint projects_key_check
  check (char_length(key) between 1 and 80 and key ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$');
