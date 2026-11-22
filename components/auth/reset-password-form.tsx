'use client';

import { useActionState } from 'react';
import { updatePassword, type AuthState } from '@/app/(auth)/actions';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';

export function ResetPasswordForm() {
  const [state, action] = useActionState<AuthState, FormData>(updatePassword, {});

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">
          Enter a new password for your account.
        </p>
      </div>

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <Field id="password" label="New password" hint="At least 8 characters.">
        <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}
