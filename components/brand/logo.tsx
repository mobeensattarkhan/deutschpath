import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/constants';

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold', className)}>
      <span
        aria-hidden="true"
        className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] bg-primary text-primary-foreground text-sm font-bold"
      >
        D
      </span>
      <span className="text-foreground">
        Deutsch<span className="text-primary">Path</span>
      </span>
      <span className="sr-only">{BRAND.name}</span>
    </span>
  );
}
