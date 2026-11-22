import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicEnv } from '@/lib/env';

/**
 * Routes that an unauthenticated visitor may reach.
 * Everything else under the app requires a session.
 */
const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/auth'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase auth session cookie on every request and redirects
 * unauthenticated users away from protected routes. Called from the root
 * `proxy.ts` (Next.js 16's renamed middleware convention).
 *
 * IMPORTANT: always return the `supabaseResponse` object (or a copy that
 * preserves its cookies) so the refreshed session is persisted in the browser.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const supabaseResponse = NextResponse.next({ request });

  // If the app is misconfigured (e.g. Supabase env vars not set yet), do not
  // take down every route with a 500 from the middleware. Let the request
  // through so pages can render a clear message instead of a blank error.
  try {
    return await refreshSession(request, supabaseResponse);
  } catch (err) {
    console.error('[proxy] session refresh skipped:', (err as Error).message);
    return supabaseResponse;
  }
}

async function refreshSession(
  request: NextRequest,
  initialResponse: NextResponse,
): Promise<NextResponse> {
  let supabaseResponse = initialResponse;

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser(): it keeps the
  // session fresh and avoids hard-to-debug logout bugs.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
