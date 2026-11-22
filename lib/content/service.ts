import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Content-serving layer. Uses the service-role client to read authoritative
 * content, and is careful to return SAFE fields to learners (no answer keys).
 *
 * By default only `published` content is served. Set CONTENT_PREVIEW=1 (never
 * in production) to also serve `needs_review`/`approved` content so you can test
 * the modules with imported-but-unreviewed content.
 */
function visibleStatuses(): string[] {
  const preview = process.env.CONTENT_PREVIEW === '1' && process.env.NODE_ENV !== 'production';
  return preview ? ['published', 'approved', 'needs_review'] : ['published'];
}

export type ModuleCode = 'grammar' | 'dictation' | 'email';

export interface StageWithProgress {
  id: string;
  stage_number: number;
  title: string;
  description: string | null;
  passing_score: number;
  status: string; // stage_progress.status or 'locked'
  best_score: number | null;
}

/** All published stages of a module joined with the learner's progress. */
export async function getModuleStagesWithProgress(
  userId: string,
  module: ModuleCode,
): Promise<StageWithProgress[]> {
  const db = createAdminClient();
  const { data: mod } = await db
    .from('modules')
    .select('id')
    .eq('code', module)
    .eq('is_published', true)
    .maybeSingle();
  if (!mod) return [];

  const { data: stages } = await db
    .from('stages')
    .select('id, stage_number, title, description, passing_score')
    .eq('module_id', mod.id)
    .eq('is_published', true)
    .order('stage_number');
  if (!stages) return [];

  const { data: progress } = await db
    .from('stage_progress')
    .select('stage_id, status, best_score')
    .eq('user_id', userId);

  const byStage = new Map((progress ?? []).map((p) => [p.stage_id, p]));
  return stages.map((s) => {
    const p = byStage.get(s.id);
    return {
      id: s.id,
      stage_number: s.stage_number,
      title: s.title,
      description: s.description,
      passing_score: s.passing_score,
      status: p?.status ?? 'locked',
      best_score: p?.best_score ?? null,
    };
  });
}

export interface SafeQuestion {
  id: string;
  question_type: string;
  prompt: string;
  source_text: string | null;
  target: string | null;
}

/** Questions for a stage with answer keys stripped (safe to send to browser). */
export async function getSafeQuestionsForStage(stageId: string): Promise<SafeQuestion[]> {
  const db = createAdminClient();
  const { data } = await db
    .from('questions')
    .select('id, question_type, prompt, source_text, target, content_status')
    .eq('stage_id', stageId)
    .in('content_status', visibleStatuses())
    .order('sort_order', { ascending: true });
  return (data ?? []).map((q) => ({
    id: q.id,
    question_type: q.question_type,
    prompt: q.prompt,
    source_text: q.source_text,
    target: q.target,
  }));
}

/** Full question incl. answer key — server-only, for evaluation. */
export async function getQuestionWithAnswer(questionId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from('questions')
    .select(
      'id, stage_id, question_type, prompt, source_text, expected_meaning, model_answer, accepted_answers, target, explanation, content_status',
    )
    .eq('id', questionId)
    .in('content_status', visibleStatuses())
    .maybeSingle();
  return data;
}

export async function getStage(stageId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from('stages')
    .select('id, module_id, stage_number, title, description, passing_score')
    .eq('id', stageId)
    .eq('is_published', true)
    .maybeSingle();
  return data;
}

/** Ensure the learner has stage_progress rows (stage 1 available). */
export async function ensureEnrollment(userClientRpc: {
  rpc: (fn: string) => Promise<{ error: unknown }>;
}): Promise<void> {
  await userClientRpc.rpc('fn_ensure_enrollment');
}
