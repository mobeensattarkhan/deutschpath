import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { buttonClasses } from '@/components/ui/button';
import { BRAND, MODULES } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';

export default async function LandingPage() {
  // The public landing page must render even if Supabase is not configured yet,
  // so a fresh deploy shows the real page instead of an error screen.
  let user = null;
  try {
    const supabase = await createClient();
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    user = null;
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Logo />
        <nav aria-label="Account" className="flex items-center gap-2">
          {user ? (
            <Link href="/dashboard" className={buttonClasses()}>
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
              >
                Log in
              </Link>
              <Link href="/register" className={buttonClasses()}>
                Create account
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:py-24">
          <p className="mb-3 inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-medium uppercase tracking-wide text-foreground">
            CEFR Level {BRAND.level}
          </p>
          <h1 className="mx-auto max-w-2xl text-4xl font-bold sm:text-5xl">
            Learn German step by step.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">{BRAND.tagline}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className={buttonClasses({ size: 'lg' })}>
              Start learning
            </Link>
            <Link href="/login" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
              I already have an account
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-20">
          <div className="grid gap-4 sm:grid-cols-3">
            {MODULES.map((m) => (
              <div key={m.key} className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {m.germanName}
                </p>
                <h2 className="mt-1 text-lg font-semibold">{m.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted-foreground">
          {BRAND.name} — a focused practice platform for German A2 learners.
        </div>
      </footer>
    </div>
  );
}
