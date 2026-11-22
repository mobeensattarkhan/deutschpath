import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';
import { getServerEnv } from '@/lib/env.server';

/**
 * Service-role Supabase client. BYPASSES Row Level Security — use only in
 * trusted server code (route handlers, content tooling) and never return raw
 * answer-key fields to the learner.
 *
 * Used to read authoritative exercise content (model answers, transcripts) that
 * learners are not allowed to read directly, and for any admin content work.
 */
let cached: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (cached) return cached;
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. It is required to load authoritative ' +
        'exercise content on the server. Add it in your environment / Vercel settings.',
    );
  }
  cached = createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
