-- ===========================================================================
-- DeutschPath — content status workflow + import columns (Milestone 2)
--
-- Adds the draft -> needs_review -> approved -> published workflow to content
-- tables, plus the columns the resource-pack import needs (stable external id,
-- source attribution, normalised register/word-range labels).
--
-- Nothing here publishes content. Import writes `needs_review` / `draft`;
-- moving content to `approved`/`published` is a deliberate human/admin action.
-- ===========================================================================

do $$ begin
  create type content_status as enum ('draft', 'needs_review', 'approved', 'published');
exception when duplicate_object then null; end $$;

-- --- lessons ---------------------------------------------------------------
alter table lessons add column if not exists external_id text;
alter table lessons add column if not exists source_note text;
alter table lessons add column if not exists content_status content_status not null default 'draft';
create unique index if not exists uq_lessons_external_id on lessons (external_id);
create index if not exists idx_lessons_status on lessons (content_status);

-- --- questions (grammar) ---------------------------------------------------
alter table questions add column if not exists external_id text;
alter table questions add column if not exists target text;          -- target grammar skill
alter table questions add column if not exists source_note text;
alter table questions add column if not exists content_status content_status not null default 'draft';
create unique index if not exists uq_questions_external_id on questions (external_id);
create index if not exists idx_questions_status on questions (content_status);

-- --- dictation_passages ----------------------------------------------------
alter table dictation_passages add column if not exists external_id text;
alter table dictation_passages add column if not exists locale text not null default 'de-DE';
alter table dictation_passages add column if not exists source_note text;
alter table dictation_passages add column if not exists content_status content_status not null default 'draft';
create unique index if not exists uq_dictation_external_id on dictation_passages (external_id);
create index if not exists idx_dictation_status on dictation_passages (content_status);

-- --- email_tasks -----------------------------------------------------------
alter table email_tasks add column if not exists external_id text;
alter table email_tasks add column if not exists register_label text;              -- raw label incl. "mixed"
alter table email_tasks add column if not exists suggested_word_count_label text;  -- raw e.g. "30–50"
alter table email_tasks add column if not exists source_note text;
alter table email_tasks add column if not exists content_status content_status not null default 'draft';
-- Ambiguous registers ("Formal or informal", "Mixed") import as NULL register
-- with the raw label preserved, so make the strict enum nullable.
alter table email_tasks alter column register drop not null;
create unique index if not exists uq_email_external_id on email_tasks (external_id);
create index if not exists idx_email_status on email_tasks (content_status);

-- --- revision_tests --------------------------------------------------------
alter table revision_tests add column if not exists source_note text;
alter table revision_tests add column if not exists content_status content_status not null default 'draft';
create index if not exists idx_revision_status on revision_tests (content_status);

-- ---------------------------------------------------------------------------
-- Vocabulary (A2 thematic starter list). Simple reference table; readable by
-- authenticated learners (no answer keys here).
-- ---------------------------------------------------------------------------
create table if not exists vocabulary (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses (id) on delete cascade,
  german text not null,
  english text not null,
  topic text,
  part_of_speech text,
  form_or_note text,
  source_note text,
  content_status content_status not null default 'needs_review',
  created_at timestamptz not null default now(),
  unique (course_id, german, english)
);
create index if not exists idx_vocab_topic on vocabulary (topic);

alter table vocabulary enable row level security;
drop policy if exists "vocab_select_published" on vocabulary;
create policy "vocab_select_published" on vocabulary
  for select to authenticated using (content_status = 'published');
