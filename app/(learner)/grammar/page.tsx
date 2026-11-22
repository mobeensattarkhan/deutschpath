import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getModuleStagesWithProgress } from '@/lib/content/service';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Grammar' };

const STATUS_LABEL: Record<string, string> = {
  locked: 'Locked',
  available: 'Available',
  in_progress: 'In progress',
  submitted: 'Submitted',
  corrections_required: 'Corrections needed',
  passed: 'Passed',
  completed: 'Completed',
};

export default async function GrammarOverview() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Make sure the learner has progress rows (stage 1 available).
  await supabase.rpc('fn_ensure_enrollment');

  const stages = await getModuleStagesWithProgress(user.id, 'grammar');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Grammar &amp; Tenses</h1>
        <p className="text-muted-foreground">
          Work through the stages in order. Finish a stage to unlock the next one.
        </p>
      </header>

      {stages.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No published grammar stages yet. Once content is imported and published, the stages
              appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ol className="space-y-2">
          {stages.map((s) => {
            const locked = s.status === 'locked';
            const done = s.status === 'completed' || s.status === 'passed';
            return (
              <li key={s.id}>
                <Card className={locked ? 'opacity-60' : ''}>
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                          done
                            ? 'bg-success text-white'
                            : locked
                              ? 'bg-surface-muted text-muted-foreground'
                              : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        {s.stage_number}
                      </span>
                      <div>
                        <p className="font-medium">{s.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {STATUS_LABEL[s.status] ?? s.status}
                          {s.best_score != null ? ` · best ${Math.round(s.best_score)}%` : ''}
                        </p>
                      </div>
                    </div>
                    {locked ? (
                      <span className="text-sm text-muted-foreground">Locked</span>
                    ) : (
                      <Link
                        href={`/grammar/${s.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {done ? 'Review' : 'Start'}
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
