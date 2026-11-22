'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signUp, type AuthState } from '@/app/(auth)/actions';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';

export function RegisterForm() {
  const [state, action] = useActionState<AuthState, FormData>(signUp, {});

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start learning German A2 step by step.</p>
      </div>

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}

      <Field id="email" label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>

      <Field id="password" label="Password" hint="At least 8 characters.">
        <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
