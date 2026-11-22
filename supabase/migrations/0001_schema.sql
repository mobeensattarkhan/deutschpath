-- ===========================================================================
-- DeutschPath — initial schema (Milestone 1)
-- PostgreSQL / Supabase. UUID primary keys, timestamps, FKs, indexes.
-- RLS is enabled in 0002_rls.sql.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- --- Enums -----------------------------------------------------------------
do $$ begin
  create type module_type as enum ('grammar', 'dictation', 'email');
exception when duplicate_object then null; end $$;

do $$ begin
  create type register_type as enum ('formal', 'informal');
exception when duplicate_object then null; end $$;

-- Stage lifecycle (shared stage/progress engine).
do $$ begin
  create type stage_status as enum (
    'locked', 'available', 'in_progress', 'submitted',
    'corrections_required', 'passed', 'completed'
  );
exception when duplicate_object then null; end $$;

-- Attempt lifecycle.
do $$ begin
  create type attempt_status as enum (
    'in_progress', 'submitted', 'evaluated',
    'corrections_required', 'passed', 'completed', 'failed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_status as enum ('pending', 'reviewed', 'dismissed');
exception when duplicate_object then null; end $$;

-- --- Shared helper: updated_at ---------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ===========================================================================
-- profiles  (1:1 with auth.users)
-- ===========================================================================
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  preferred_explanation_language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Create a profile row automatically when a new auth user signs up.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(coalesce(new.email, ''), '@', 1))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ===========================================================================
-- Curriculum structure: courses -> modules -> stages -> (lessons, exercises)
-- ===========================================================================
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,            -- e.g. 'de-A2'
  title text not null,
  level text not null,                  -- 'A2' for now
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  code module_type not null,            -- grammar | dictation | email
  title text not null,
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (course_id, code)
);
create index if not exists idx_modules_course on modules (course_id);

create table if not exists stages (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules (id) on delete cascade,
  stage_number integer not null,
  title text not null,
  description text,
  difficulty text,
  passing_score integer not null default 80,          -- platform rule, configurable
  time_limit_seconds integer,                          -- null = untimed
  completion_config jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (module_id, stage_number)
);
create index if not exists idx_stages_module on stages (module_id);

create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references stages (id) on delete cascade,
  title text not null,
  explanation text,
  examples jsonb not null default '[]'::jsonb,
  learning_objectives jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_lessons_stage on lessons (stage_id);

-- Grammar questions.
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references stages (id) on delete cascade,
  question_type text not null,
  prompt text not null,
  source_text text,
  expected_meaning text,
  model_answer text,
  accepted_answers jsonb not null default '[]'::jsonb,
  grammar_tags jsonb not null default '[]'::jsonb,
  difficulty text,
  explanation text,
  sort_order integer not null default 0,
  content_version integer not null default 1,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_questions_stage on questions (stage_id);

-- Dictation passages. transcript is sensitive (must not reach the browser
-- before submission) — access is mediated by a server endpoint.
create table if not exists dictation_passages (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references stages (id) on delete cascade,
  title text not null,
  transcript text not null,
  word_count integer not null,
  difficulty text,
  topic text,
  audio_storage_path text,
  audio_provider text,
  voice_id text,
  audio_version integer not null default 1,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_dictation_stage on dictation_passages (stage_id);

-- Email writing tasks.
create table if not exists email_tasks (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references stages (id) on delete cascade,
  title text not null,
  scenario text not null,
  recipient_context text,
  register register_type not null,
  required_points jsonb not null default '[]'::jsonb,
  suggested_word_min integer,
  suggested_word_max integer,
  time_limit_seconds integer,
  rubric jsonb not null default '{}'::jsonb,
  sample_answer text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_email_tasks_stage on email_tasks (stage_id);

-- ===========================================================================
-- Learner activity: attempts, evaluations, corrections, progress, mistakes
-- ===========================================================================
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stage_id uuid not null references stages (id) on delete cascade,
  -- Polymorphic reference to the specific exercise (question / passage / task).
  -- No FK because it targets different tables by module; validated in app code.
  exercise_id uuid,
  attempt_number integer not null default 1,
  submitted_content text,
  score numeric(5, 2),
  status attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  evaluation_id uuid,                      -- FK added after ai_evaluations exists
  created_at timestamptz not null default now()
);
create index if not exists idx_attempts_user on attempts (user_id);
create index if not exists idx_attempts_stage on attempts (stage_id);
create index if not exists idx_attempts_user_stage on attempts (user_id, stage_id);

create table if not exists ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts (id) on delete cascade,
  module_type module_type not null,
  prompt_version text,
  model text,
  score numeric(5, 2),
  result_json jsonb not null default '{}'::jsonb,
  needs_review boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_eval_attempt on ai_evaluations (attempt_id);

-- Now wire the attempts.evaluation_id FK (circular dependency resolved here).
alter table attempts
  drop constraint if exists attempts_evaluation_id_fkey;
alter table attempts
  add constraint attempts_evaluation_id_fkey
  foreign key (evaluation_id) references ai_evaluations (id) on delete set null;

create table if not exists corrections (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts (id) on delete cascade,
  evaluation_error_id text,                -- id/span of the flagged error in the evaluation
  original_text text,
  required_correction text,
  learner_correction text,
  is_resolved boolean not null default false,
  validated_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_corrections_attempt on corrections (attempt_id);

create table if not exists stage_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stage_id uuid not null references stages (id) on delete cascade,
  status stage_status not null default 'locked',
  unlocked_at timestamptz,
  completed_at timestamptz,
  best_score numeric(5, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, stage_id)
);
create index if not exists idx_stage_progress_user on stage_progress (user_id);

drop trigger if exists trg_stage_progress_updated_at on stage_progress;
create trigger trg_stage_progress_updated_at
  before update on stage_progress
  for each row execute function set_updated_at();

create table if not exists mistake_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid references attempts (id) on delete set null,
  category text,
  mistake_text text,
  corrected_text text,
  explanation text,
  review_status review_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists idx_mistakes_user on mistake_history (user_id);

create table if not exists revision_tests (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules (id) on delete cascade,
  title text not null,
  after_stage_number integer not null,
  passing_score integer not null default 80,
  test_config jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_revision_tests_module on revision_tests (module_id);
