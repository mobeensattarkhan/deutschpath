import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/** Consistent API envelope (brief §9). */
export function ok<T>(data: T, init?: number) {
  return NextResponse.json({ success: true, data, error: null }, { status: init ?? 200 });
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

/** Resolve the authenticated user from the session, or null. */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
