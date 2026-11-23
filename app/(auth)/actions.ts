'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/env';

export interface AuthState {
  error?: string;
  message?: string;
}

const credentialsSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

const signUpSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const emailSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
});

const newPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Please check the form and try again.';
}

const NOT_CONFIGURED =
  'This site is not fully set up yet: the Supabase environment variables are missing on the server. Add them in your hosting settings and redeploy.';

/** Create the Supabase client, turning a config error into a clean message. */
async function getClientOrError() {
  try {
    return { client: await createClient(), error: null as string | null };
  } catch {
    return { client: null, error: NOT_CONFIGURED };
  }
}

/** Only allow internal relative redirect targets (no open redirects). */
function safeRedirectTarget(value: FormDataEntryValue | null): string {
  const raw = typeof value === 'string' ? value : '';
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { client, error: cfg } = await getClientOrError();
  if (!client) return { error: cfg };

  let result;
  try {
    result = await client.auth.signInWithPassword(parsed.data);
  } catch {
    return { error: 'Cannot reach the authentication service right now. Please try again.' };
  }
  if (result.error) return { error: 'Email or password is incorrect.' };

  redirect(safeRedirectTarget(formData.get('redirectTo')));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { client, error: cfg } = await getClientOrError();
  if (!client) return { error: cfg };

  let data;
  let error;
  try {
    ({ data, error } = await client.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      },
    }));
  } catch {
    return { error: 'Cannot reach the authentication service right now. Please try again.' };
  }

  if (error) return { error: error.message };
  if (!data) return { error: 'Sign-up did not complete. Please try again.' };

  // If email confirmation is enabled, there is no active session yet.
  if (!data.session) {
    return {
      message:
        'Account created. Check your email for a confirmation link, then sign in.',
    };
  }

  redirect('/dashboard');
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = emailSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { client, error: cfg } = await getClientOrError();
  if (!client) return { error: cfg };

  // Do not reveal whether an account exists — always show the same message.
  try {
    await client.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/reset-password`,
    });
  } catch {
    // swallow — same neutral message below
  }
  return { message: 'If that email has an account, a reset link is on its way.' };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = newPasswordSchema.safeParse({ password: formData.get('password') });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { client, error: cfg } = await getClientOrError();
  if (!client) return { error: cfg };

  let error;
  try {
    ({ error } = await client.auth.updateUser({ password: parsed.data.password }));
  } catch {
    return { error: 'Cannot reach the authentication service right now. Please try again.' };
  }
  if (error) return { error: error.message };

  redirect('/dashboard');
}
