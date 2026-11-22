import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv } from '@/lib/env';

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 * `cookies()` is async in Next.js 16, so this function is async.
 *
 * Server Components cannot write cookies; the `setAll` try/catch swallows that
 * case because the proxy (middleware) is responsible for refreshing the session
 * cookie on each request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — safe to ignore. The session is
            // refreshed by the middleware before the component renders.
          }
        },
      },
    },
  );
}
