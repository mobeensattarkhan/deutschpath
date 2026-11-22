import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BRAND } from '@/lib/constants';

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — Learn German A2 step by step`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.tagline,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // UI language is English (explanations are in simple English for A2 learners).
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
