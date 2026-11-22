import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';

/**
 * Protected layout for all learner pages. The middleware already redirects
 * unauthenticated users, but we check again here as defence in depth — never
 * trust a single gate for protected data.
 */
export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <AppShell userEmail={user.email ?? ''}>{children}</AppShell>;
}
