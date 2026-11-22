import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { ok, fail, getUser } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAcceptedAnswer } from '@/lib/ai/compare';

const bodySchema = z.object({
  correctionId: z.string().uuid(),
  learnerCorrection: z.string().trim().min(1).max(2000),
});

/**
 * Validate a learner's correction. A correction resolves only when it leniently
 * matches the required correction. Unresolved corrections block stage
 * completion (the mistake gate, enforced server-side in fn_complete_stage).
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return fail('UNAUTHENTICATED', 'Please sign in.', 401);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Please correct the highlighted items.');

  const { correctionId, learnerCorrection } = parsed.data;
  const db = createAdminClient();

  // Load the correction and verify it belongs to this learner.
  const { data: corr } = await db
    .from('corrections')
    .select('id, attempt_id, required_correction, attempts!inner(user_id)')
    .eq('id', correctionId)
    .maybeSingle();

  const owner = (corr?.attempts as { user_id?: string } | null)?.user_id;
  if (!corr || owner !== user.id) return fail('NOT_FOUND', 'Correction not found.', 404);

  const resolved = isAcceptedAnswer(learnerCorrection, corr.required_correction ?? '', []);

  await db
    .from('corrections')
    .update({
      learner_correction: learnerCorrection,
      is_resolved: resolved,
      validated_at: resolved ? new Date().toISOString() : null,
    })
    .eq('id', correctionId);

  if (resolved) {
    await db
      .from('mistake_history')
      .update({ review_status: 'reviewed' })
      .eq('attempt_id', corr.attempt_id)
      .eq('corrected_text', corr.required_correction);
  }

  return ok({
    resolved,
    feedback: resolved
      ? 'Correction accepted.'
      : 'Not quite — compare carefully with the required correction and try again.',
  });
}
