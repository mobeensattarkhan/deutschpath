import { z } from 'zod';

/**
 * Public environment variables (safe to read in the browser).
 * These are inlined by Next.js at build time and must be prefixed NEXT_PUBLIC_.
 *
 * Validation is LAZY: it runs the first time a value is actually read (at
 * request time), not when this module is imported. That keeps `next build`
 * from crashing while it collects page data in an environment where the vars
 * are not yet set — the app instead fails with a clear error only if it is
 * actually run without configuration.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
});

type PublicEnv = z.infer<typeof publicEnvSchema>;

let cached: PublicEnv | null = null;

function load(): PublicEnv {
  if (cached) return cached;
  const parsed = publicEnvSchema.safeParse({
    // Referenced as explicit literals so Next.js inlines them in client bundles.
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(
      `Invalid or missing public environment variables: ${missing}. ` +
        `Set them in your Vercel Project → Settings → Environment Variables ` +
        `(or in .env.local for local development).`,
    );
  }
  cached = parsed.data;
  return cached;
}

/**
 * Lazily-validated public env. Accessing a property triggers validation the
 * first time; subsequent reads use the cached, parsed values.
 */
export const publicEnv = {
  get NEXT_PUBLIC_SUPABASE_URL() {
    return load().NEXT_PUBLIC_SUPABASE_URL;
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return load().NEXT_PUBLIC_SUPABASE_ANON_KEY;
  },
  get NEXT_PUBLIC_SITE_URL() {
    return load().NEXT_PUBLIC_SITE_URL;
  },
};
