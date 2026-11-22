import * as React from 'react';
import { cn } from '@/lib/utils';

type Tone = 'error' | 'success' | 'info';

const toneClasses: Record<Tone, string> = {
  error: 'bg-danger-soft text-danger border-danger/30',
  success: 'bg-success-soft text-success border-success/30',
  info: 'bg-accent-soft text-foreground border-accent/30',
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
}

/**
 * Status message. `role="alert"` is set for errors so screen readers announce
 * them immediately; info/success use `role="status"`.
 */
export function Alert({ className, tone = 'info', ...props }: AlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-[var(--radius)] border px-4 py-3 text-sm',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
