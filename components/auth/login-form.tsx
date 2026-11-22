'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signIn, type AuthState } from '@/app/(auth)/actions';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signIn, {});

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Log in</h1>
        <p className="text-sm text-muted-foreground">Welcome back. Continue your A2 practice.</p>
      </div>

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <input type="hidden" name="redirectTo" value={redirectTo} />

      <Field id="email" label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>

      <Field id="password" label="Password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Log in
      </SubmitButton>

      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-primary hover:underline">
          Forgot password?
        </Link>
        <Link href="/register" className="text-primary hover:underline">
          Create account
        </Link>
      </div>
    </form>
  );
}
