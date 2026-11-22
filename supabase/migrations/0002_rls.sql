-- ===========================================================================
-- DeutschPath — Row Level Security (Milestone 1)
--
-- Principles (from brief §8.15):
--  * Learners read/update only their own data.
--  * Learners cannot directly insert completed progress — progression is
--    written server-side (service role) inside a transaction.
--  * Published curriculum METADATA is readable by authenticated learners.
--  * Exercise answer keys stay server-only: questions, dictation_passages,
--    email_tasks and revision_tests have RLS enabled with NO learner policy,
--    so they are reachable only via trusted server endpoints (service role,
--    which bypasses RLS). This is how model answers / transcripts are kept
--    hidden until an attempt is submitted.
-- ===========================================================================

-- Enable RLS everywhere.
alter table profiles            enable row level security;
alter table courses             enable row level security;
alter table modules             enable row level security;
alter table stages              enable row level security;
alter table lessons             enable row level security;
alter table questions           enable row level security;
alter table dictation_passages  enable row level security;
alter table email_tasks         enable row level security;
alter table attempts            enable row level security;
alter table ai_evaluations      enable row level security;
alter table corrections         enable row level security;
alter table stage_progress      enable row level security;
alter table mistake_history     enable row level security;
alter table revision_tests      enable row level security;

-- --- profiles --------------------------------------------------------------
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- --- Published curriculum metadata (readable by learners) ------------------
drop policy if exists "courses_select_published" on courses;
create policy "courses_select_published" on courses
  for select to authenticated using (is_published);

drop policy if exists "modules_select_published" on modules;
create policy "modules_select_published" on modules
  for select to authenticated using (is_published);

drop policy if exists "stages_select_published" on stages;
create policy "stages_select_published" on stages
  for select to authenticated using (is_published);

drop policy if exists "lessons_select_published_stage" on lessons;
create policy "lessons_select_published_stage" on lessons
  for select to authenticated
  using (exists (
    select 1 from stages s
    where s.id = lessons.stage_id and s.is_published
  ));

-- NOTE: questions, dictation_passages, email_tasks, revision_tests have NO
-- learner-facing policy on purpose. With RLS enabled and no policy, the
-- anon/authenticated roles get zero rows. Trusted server code uses the service
-- role (which bypasses RLS) and returns only safe fields to the learner.

-- --- attempts (own) --------------------------------------------------------
drop policy if exists "attempts_select_own" on attempts;
create policy "attempts_select_own" on attempts
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "attempts_insert_own" on attempts;
create policy "attempts_insert_own" on attempts
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "attempts_update_own" on attempts;
create policy "attempts_update_own" on attempts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- --- ai_evaluations (read own via attempt) ---------------------------------
drop policy if exists "ai_eval_select_own" on ai_evaluations;
create policy "ai_eval_select_own" on ai_evaluations
  for select to authenticated
  using (exists (
    select 1 from attempts a
    where a.id = ai_evaluations.attempt_id and a.user_id = (select auth.uid())
  ));

-- --- corrections (own via attempt) -----------------------------------------
drop policy if exists "corrections_select_own" on corrections;
create policy "corrections_select_own" on corrections
  for select to authenticated
  using (exists (
    select 1 from attempts a
    where a.id = corrections.attempt_id and a.user_id = (select auth.uid())
  ));

drop policy if exists "corrections_insert_own" on corrections;
create policy "corrections_insert_own" on corrections
  for insert to authenticated
  with check (exists (
    select 1 from attempts a
    where a.id = corrections.attempt_id and a.user_id = (select auth.uid())
  ));

-- --- stage_progress (read own only; writes are server-side) ----------------
drop policy if exists "stage_progress_select_own" on stage_progress;
create policy "stage_progress_select_own" on stage_progress
  for select to authenticated using (user_id = (select auth.uid()));
-- No insert/update policy: learners cannot grant themselves progress.

-- --- mistake_history (read own only; writes are server-side) ---------------
drop policy if exists "mistakes_select_own" on mistake_history;
create policy "mistakes_select_own" on mistake_history
  for select to authenticated using (user_id = (select auth.uid()));
