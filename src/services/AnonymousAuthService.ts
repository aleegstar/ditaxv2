/**
 * Anonymous Auth Service
 *
 * Lets new Despia-native users start using Ditax without an explicit login.
 * Behind the scenes we call `supabase.auth.signInAnonymously()` and bind the
 * resulting `user.id` to the device via the Despia Storage Vault.
 *
 * Later, the user can upgrade their anonymous account to a permanent one by
 * adding an email (`supabase.auth.updateUser({email})`). Because the
 * `user.id` does not change, all form data, documents, and tax_filers stay
 * attached to the same account.
 */
import { supabase } from '@/integrations/supabase/client';
import { readAnonUid, writeAnonUid } from '@/lib/deviceVault';
import { isDespiaNative } from '@/lib/despia';

export interface AnonymousSession {
  userId: string;
  isAnonymous: true;
  vaultMatched: boolean;
}

/**
 * Check whether the current Supabase session belongs to an anonymous user.
 * Reads the `is_anonymous` claim from the JWT/user object.
 */
export function isAnonymousUser(user: { is_anonymous?: boolean } | null | undefined): boolean {
  return !!user?.is_anonymous;
}

/**
 * Start (or restore) an anonymous Supabase session.
 *
 * - If a session already exists in localStorage, returns immediately.
 * - Otherwise calls `signInAnonymously()` and persists the user.id into the
 *   Despia vault for later cross-launch identification.
 *
 * Throws if Supabase rejects the call (e.g. provider disabled).
 */
export async function startAnonymousSession(): Promise<AnonymousSession> {
  const { data: existing } = await supabase.auth.getSession();
  if (existing?.session?.user) {
    const u = existing.session.user;
    return {
      userId: u.id,
      isAnonymous: !!(u as any).is_anonymous,
      vaultMatched: true,
    };
  }

  const previousAnonUid = await readAnonUid();

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data?.user) {
    throw new Error(
      `Anonymer Login fehlgeschlagen: ${error?.message || 'unbekannter Fehler'}`,
    );
  }

  await writeAnonUid(data.user.id);

  return {
    userId: data.user.id,
    isAnonymous: true,
    vaultMatched: previousAnonUid === data.user.id,
  };
}

/**
 * Upgrade an anonymous account to a permanent one by attaching an email.
 * Supabase sends a confirmation magic-link to that address — the account is
 * only considered permanent once the user clicks the link.
 */
export async function upgradeAnonymousToEmail(email: string): Promise<void> {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error('Bitte gib eine gültige E-Mail-Adresse ein.');
  }

  const { error } = await supabase.auth.updateUser({ email: trimmed });
  if (error) {
    throw new Error(error.message);
  }

  // Audit log — best-effort, never block on failure.
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      await supabase.from('anonymous_upgrades').insert({
        user_id: user.id,
        method: 'email',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
      });
    }
  } catch (e) {
    console.warn('[AnonymousAuthService] audit log failed', e);
  }
}

/**
 * Convenience: only true if we can offer the anonymous flow at all
 * (Despia native runtime).
 */
export function canUseAnonymousFlow(): boolean {
  return isDespiaNative();
}
