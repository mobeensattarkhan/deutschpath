import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStage, getSafeQuestionsForStage } from '@/lib/content/service';
import { GrammarStagePlayer } from '@/components/grammar/stage-player';
import { buttonClasses } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export const metadata: Metadata = { title: 'Grammar stage' };

export default async function GrammarStagePage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const stage = await getStage(stageId);
  if (!stage) notFound();

  // Access check: the learner's progress row must exist and not be locked.
  const { data: progress } = await supabase
    .from('stage_progress')
    .select('status')
    .eq('user_id', user.id)
    .eq('stage_id', stageId)
    .maybeSingle();

  if (!progress || progress.status === 'locked') {
    return (
      <div className="space-y-4">
        <Alert tone="info">This stage is locked. Finish the previous stage to unlock it.</Alert>
        <Link href="/grammar" className={buttonClasses({ variant: 'secondary' })}>
          Back to Grammar
        </Link>
      </div>
    );
  }

  const questions = await getSafeQuestionsForStage(stageId);

  return (
    <GrammarStagePlayer
      stageId={stage.id}
      stageTitle={`${stage.stage_number} — ${stage.title}`}
      stageObjective={stage.description}
      passingScore={stage.passing_score}
      questions={questions}
    />
  );
}
