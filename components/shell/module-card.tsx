import { Card, CardContent } from '@/components/ui/card';
import type { ModuleMeta } from '@/lib/constants';

/**
 * Dashboard card for one learning module.
 *
 * In Milestone 1 there is no learner progress yet, so `completedStages`
 * defaults to 0 and the card links to the (not-yet-built) module overview.
 * Progress is shown with text, not colour alone (accessibility).
 */
export function ModuleCard({
  module,
  completedStages = 0,
}: {
  module: ModuleMeta;
  completedStages?: number;
}) {
  const pct = Math.round((completedStages / module.totalStages) * 100);

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {module.germanName}
          </p>
          <h3 className="text-lg font-semibold">{module.title}</h3>
        </div>

        <p className="flex-1 text-sm text-muted-foreground">{module.description}</p>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Stage {Math.min(completedStages + 1, module.totalStages)} of {module.totalStages}
            </span>
            <span>{pct}% complete</span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${module.title} progress`}
          >
            <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
