-- ===========================================================================
-- DeutschPath — seed data (Milestone 1)
--
-- This seeds only the curriculum STRUCTURE (one A2 course + its three modules).
-- Actual learning content — stages, lessons, questions, dictation passages and
-- email tasks — is authored and validated in later milestones (see §14), then
-- inserted via the content/import workflow. Nothing here contains answer keys.
--
-- Safe to run multiple times (idempotent via ON CONFLICT).
-- ===========================================================================

insert into courses (code, title, level, is_published)
values ('de-A2', 'German A2', 'A2', true)
on conflict (code) do update
  set title = excluded.title,
      level = excluded.level,
      is_published = excluded.is_published;

insert into modules (course_id, code, title, description, sort_order, is_published)
select c.id, m.code::module_type, m.title, m.description, m.sort_order, true
from courses c
cross join (values
  ('grammar',   'Grammar & Tenses', 'Staged A2 grammar and sentence construction.', 1),
  ('dictation', 'Dictation',        'Listen to German audio and type what you hear.', 2),
  ('email',     'Email Writing',    'Guided everyday A2 email writing practice.', 3)
) as m(code, title, description, sort_order)
where c.code = 'de-A2'
on conflict (course_id, code) do update
  set title = excluded.title,
      description = excluded.description,
      sort_order = excluded.sort_order,
      is_published = excluded.is_published;
