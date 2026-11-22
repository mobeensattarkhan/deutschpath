import 'server-only';
import { z } from 'zod';

/**
 * Server-only environment variables. This module must never be imported by a
 * Client Component — the `server-only` guard turns that into a build error.
 *
 * Milestone 1 only requires the Supabase service role key to be *optional*
 * (it is used by admin/content tooling in later milestones). AI and TTS keys
 * are declared for later milestones and are not validated as required yet.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_EVAL_MODEL: z.string().optional(),
  TTS_PROVIDER: z.enum(['mock', 'telnyx']).default('mock'),
  TELNYX_API_KEY: z.string().optional(),
});

let cached: z.infer<typeof serverEnvSchema> | null = null;

export function getServerEnv() {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid server environment variables: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}
