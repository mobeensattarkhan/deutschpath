import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

/**
 * Authenticated application shell: a top bar with brand, the signed-in user and
 * a sign-out action. Responsive — the user email hides on small screens.
 *
 * Module navigation (Grammar / Dictation / Email) is intentionally not shown in
 * Milestone 1 because those routes do not exist yet. It will be added when the
 * module overview pages are built, so the nav never points at a 404.
 */
export function AppShell({ userEmail, children }: { userEmail: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="shrink-0" aria-label="Go to dashboard">
              <Logo />
            </Link>
            <nav aria-label="Main" className="hidden sm:block">
              <ul className="flex items-center gap-1">
                <li>
                  <Link
                    href="/dashboard"
                    className="rounded-[var(--radius-sm)] px-3 py-2 text-sm text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/grammar"
                    className="rounded-[var(--radius-sm)] px-3 py-2 text-sm text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  >
                    Grammar
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline" title={userEmail}>
              {userEmail}
            </span>
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="secondary" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
