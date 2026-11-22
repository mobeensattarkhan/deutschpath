-- ===========================================================================
-- DeutschPath — stage & progression engine (Milestone 3)
--
-- The SERVER decides completion. Two things enforce that here:
--  1. Learners can no longer write their own attempts/corrections directly —
--     those writes happen in trusted server routes (service role). Learners
--     keep read-only access to their own rows.
--  2. Completion + unlocking the next stage happens inside ONE transactional,
--     SECURITY DEFINER function that re-checks every condition using auth.uid().
--     An LLM or client cannot set `completed: true`.
-- ===========================================================================

-- Writes to attempts/corrections are server-only now (close the score-forgery
-- hole: a learner could otherwise insert an attempt with score = 100).
drop policy if exists "attempts_insert_own" on attempts;
drop policy if exists "attempts_update_own" on attempts;
drop policy if exists "corrections_insert_own" on corrections;
-- (attempts_select_own and corrections_select_own remain: read-only for learners.)

-- --- Ensure a learner is enrolled: stage 1 of each module available ---------
create or replace function fn_ensure_enrollment()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  insert into stage_progress (user_id, stage_id, status, unlocked_at)
  select
    v_user,
    s.id,
    case when s.stage_number = 1 then 'available'::stage_status else 'locked'::stage_status end,
    case when s.stage_number = 1 then now() else null end
  from stages s
  where s.is_published
  on conflict (user_id, stage_id) do nothing;
end;
$$;

-- --- Complete a stage (authoritative + atomic) -----------------------------
create or replace function fn_complete_stage(p_stage uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_passing int;
  v_module uuid;
  v_stage_number int;
  v_best numeric;
  v_unresolved int;
  v_next uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select passing_score, module_id, stage_number
    into v_passing, v_module, v_stage_number
  from stages
  where id = p_stage and is_published;

  if not found then
    return jsonb_build_object('completed', false, 'error', 'stage_not_found');
  end if;

  -- Stage must be unlocked for this learner.
  if not exists (
    select 1 from stage_progress sp
    where sp.user_id = v_user and sp.stage_id = p_stage and sp.status <> 'locked'
  ) then
    return jsonb_build_object('completed', false, 'reason', 'stage_locked');
  end if;

  -- Stage score = average of each exercise's best score (so one good answer
  -- cannot complete a multi-question stage on its own).
  select avg(best)::numeric into v_best
  from (
    select max(score) as best
    from attempts
    where user_id = v_user and stage_id = p_stage
    group by exercise_id
  ) per_exercise;

  select count(*) into v_unresolved
  from corrections c
  join attempts a on a.id = c.attempt_id
  where a.user_id = v_user and a.stage_id = p_stage and c.is_resolved = false;

  -- Re-check every completion condition here (never trust the caller).
  if v_best is null or v_best < v_passing or v_unresolved > 0 then
    return jsonb_build_object(
      'completed', false,
      'best_score', v_best,
      'unresolved_corrections', v_unresolved,
      'passing_score', v_passing
    );
  end if;

  -- Mark complete.
  update stage_progress
    set status = 'completed', completed_at = now(), best_score = v_best, updated_at = now()
  where user_id = v_user and stage_id = p_stage;

  -- Unlock the next stage in the same module, if any.
  select id into v_next
  from stages
  where module_id = v_module and stage_number = v_stage_number + 1 and is_published;

  if v_next is not null then
    insert into stage_progress (user_id, stage_id, status, unlocked_at)
    values (v_user, v_next, 'available', now())
    on conflict (user_id, stage_id) do update
      set status = case when stage_progress.status = 'locked' then 'available'::stage_status
                        else stage_progress.status end,
          unlocked_at = coalesce(stage_progress.unlocked_at, now()),
          updated_at = now();
  end if;

  return jsonb_build_object(
    'completed', true,
    'unlocked_next', v_next is not null,
    'best_score', v_best
  );
end;
$$;

grant execute on function fn_ensure_enrollment() to authenticated;
grant execute on function fn_complete_stage(uuid) to authenticated;
