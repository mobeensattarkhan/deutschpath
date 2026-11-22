import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { ok, fail, getUser } from '@/lib/api';
import { createClient } from '@/lib/supabase/server';

const bodySchema = z.object({ stageId: z.string().uuid() });

/**
 * Server-side stage completion. Delegates to the SECURITY DEFINER Postgres
 * function `fn_complete_stage`, which re-checks every condition (passing score,
 * no unresolved corrections) using auth.uid() and unlocks the next stage
 * atomically. The client cannot set completion directly.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return fail('UNAUTHENTICATED', 'Please sign in.', 401);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('VALIDATION_ERROR', 'Invalid request.');

  // Use the USER session client so auth.uid() resolves inside the function.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('fn_complete_stage', { p_stage: parsed.data.stageId });
  if (error) return fail('SERVER_ERROR', 'Could not complete the stage.', 500);

  return ok(data);
}
