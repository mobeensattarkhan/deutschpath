import type { Metadata } from 'next';
import Link from 'next/link';
import { ModuleCard } from '@/components/shell/module-card';
import { Card, CardContent } from '@/components/ui/card';
import { BRAND, MODULES } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Profile row is created automatically on sign-up by a DB trigger.
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user!.id)
    .maybeSingle();

  const greetingName = profile?.display_name || user?.email?.split('@')[0] || 'there';

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {greetingName}</h1>
          <p className="text-sm text-muted-foreground">
            Your German course · Level {BRAND.level}
          </p>
        </div>
        <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success">
          A2 learner
        </span>
      </section>

      <section aria-labelledby="modules-heading" className="space-y-3">
        <h2 id="modules-heading" className="text-lg font-semibold">
          Your learning modules
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) =>
            m.key === 'grammar' ? (
              <Link key={m.key} href="/grammar" className="block rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ModuleCard module={m} completedStages={0} />
              </Link>
            ) : (
              <div key={m.key} className="relative">
                <ModuleCard module={m} completedStages={0} />
                <span className="absolute right-3 top-3 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground">
                  Coming soon
                </span>
              </div>
            ),
          )}
        </div>
      </section>

      <section>
        <Card>
          <CardContent>
            <h2 className="text-base font-semibold">You are all set up</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your account and dashboard are ready. The interactive lessons for each module —
              staged grammar practice, audio dictation and guided email writing — are being added
              next. Progress you make will appear on these cards.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
