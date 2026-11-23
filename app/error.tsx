'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
      <p className="text-muted-foreground">
        This page hit an unexpected error. Common causes on a fresh deploy are missing Supabase
        environment variables, or the database migrations not having been run yet.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">
          Error reference: <code className="font-mono">{error.digest}</code> (find this in your
          hosting provider’s function logs to see the exact cause).
        </p>
      ) : null}
      <button
        onClick={reset}
        className="inline-flex h-11 items-center justify-center rounded-[var(--radius)] bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
      >
        Try again
      </button>
    </div>
  );
}
