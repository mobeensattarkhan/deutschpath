import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { ok, fail, getUser } from '@/lib/api';
import { getQuestionWithAnswer } from '@/lib/content/service';
import { createAdminClient } from '@/lib/supabase/admin';
import { evaluateGrammar } from '@/lib/ai';

const bodySchema = z.object({
  stageId: z.string().uuid(),
  questionId: z.string().uuid(),
  answer: z.string().trim().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return fail('UNAUTHENTICATED', 'Please sign in.', 401);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Please correct the highlighted items.');

  const { stageId, questionId, answer } = parsed.data;
  const q = await getQuestionWithAnswer(questionId);
  if (!q || q.stage_id !== stageId) return fail('NOT_FOUND', 'Question not found.', 404);

  const accepted = Array.isArray(q.accepted_answers) ? (q.accepted_answers as string[]) : [];

  let evalResult;
  let meta;
  try {
    ({ result: evalResult, meta } = await evaluateGrammar({
      instruction: `Grammar task (${q.question_type}).`,
      prompt: q.prompt,
      expectedMeaning: q.expected_meaning,
      modelAnswer: q.model_answer ?? '',
      acceptedAnswers: accepted,
      targetGrammar: q.target ?? '',
      learnerAnswer: answer,
    }));
  } catch {
    // Provider failure: do NOT consume the attempt. (brief §6.5)
    return fail(
      'EVALUATION_UNAVAILABLE',
      'Evaluation is temporarily unavailable. Your attempt was not recorded — please try again.',
      503,
    );
  }

  const db = createAdminClient();

  const { data: prev } = await db
    .from('attempts')
    .select('id')
    .eq('user_id', user.id)
    .eq('stage_id', stageId)
    .eq('exercise_id', questionId);
  const attemptNumber = (prev?.length ?? 0) + 1;

  const blocking = evalResult.errors.filter((e) => e.blocking);
  const status = evalResult.is_correct
    ? 'passed'
    : blocking.length > 0
      ? 'corrections_required'
      : 'submitted';

  const { data: attempt, error: aErr } = await db
    .from('attempts')
    .insert({
      user_id: user.id,
      stage_id: stageId,
      exercise_id: questionId,
      attempt_number: attemptNumber,
      submitted_content: answer,
      score: evalResult.score,
      status,
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (aErr || !attempt) return fail('SERVER_ERROR', 'Could not record the attempt.', 500);

  const { data: evalRow } = await db
    .from('ai_evaluations')
    .insert({
      attempt_id: attempt.id,
      module_type: 'grammar',
      prompt_version: meta.promptVersion,
      model: `${meta.provider}:${meta.model}`,
      score: evalResult.score,
      result_json: evalResult,
      needs_review: evalResult.needs_review,
    })
    .select('id')
    .single();
  if (evalRow) await db.from('attempts').update({ evaluation_id: evalRow.id }).eq('id', attempt.id);

  if (blocking.length > 0) {
    await db.from('corrections').insert(
      blocking.map((e) => ({
        attempt_id: attempt.id,
        evaluation_error_id: e.category,
        original_text: answer,
        required_correction: e.correction,
        is_resolved: false,
      })),
    );
    await db.from('mistake_history').insert(
      blocking.map((e) => ({
        user_id: user.id,
        attempt_id: attempt.id,
        category: e.category,
        mistake_text: answer,
        corrected_text: e.correction,
        explanation: e.explanation,
        review_status: evalResult.needs_review ? 'pending' : 'reviewed',
      })),
    );
  }

  const { data: corrections } = await db
    .from('corrections')
    .select('id, required_correction, original_text, is_resolved')
    .eq('attempt_id', attempt.id);

  return ok({
    attemptId: attempt.id,
    isCorrect: evalResult.is_correct,
    score: evalResult.score,
    needsReview: evalResult.needs_review,
    feedback: evalResult.feedback,
    errors: evalResult.errors,
    optionalSuggestions: evalResult.optional_suggestions,
    corrections: corrections ?? [],
  });
}
