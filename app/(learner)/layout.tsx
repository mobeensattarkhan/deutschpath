import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';

/**
 * Protected layout for all learner pages. The middleware already redirects
 * unauthenticated users, but we check again here as defence in depth — never
 * trust a single gate for protected data.
 */
export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  let user = null;
  try {
    const supabase = await createClient();
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    user = null;
  }

  // Not signed in (or backend not configured) → send to login rather than crash.
  if (!user) redirect('/login');

  return <AppShell userEmail={user.email ?? ''}>{children}</AppShell>;
}
