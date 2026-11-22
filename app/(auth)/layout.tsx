import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

/**
 * Centred layout for the authentication pages.
 *
 * Note: this layout deliberately does NOT redirect signed-in users away,
 * because the reset-password page is reached while holding a temporary recovery
 * session. The landing page handles sending signed-in users to the dashboard.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-5xl px-4 py-4">
        <Link href="/" aria-label="DeutschPath home">
          <Logo />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
