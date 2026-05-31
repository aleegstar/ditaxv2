import React, { createContext, useCallback, useContext, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UpgradeAccountDialog } from '@/components/auth/UpgradeAccountDialog';

interface RequestOptions {
  /** When true the dialog cannot be dismissed without upgrading. */
  hardBlock?: boolean;
  /** Custom reason shown in the dialog body. */
  reason?: string;
  /** Trigger key used for snooze tracking (e.g. "after_first_upload"). */
  snoozeKey?: string;
  /** Max times this trigger may be snoozed before turning into a hard block. */
  maxSnooze?: number;
}

interface AnonymousUpgradeContextValue {
  /**
   * Show the upgrade dialog if the current user is anonymous.
   * Returns `true` when the dialog was opened, `false` if the user is
   * already permanent or the trigger was snoozed past its limit.
   */
  requestUpgrade: (options?: RequestOptions) => boolean;
  isAnonymous: boolean;
}

const AnonymousUpgradeContext = createContext<AnonymousUpgradeContextValue | undefined>(undefined);

const SNOOZE_STORAGE_PREFIX = 'ditax_upgrade_snoozed_';

export const AnonymousUpgradeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAnonymous } = useAuth();
  const [open, setOpen] = useState(false);
  const [hardBlock, setHardBlock] = useState(false);
  const [reason, setReason] = useState<string | undefined>(undefined);
  const lastSnoozeKey = useRef<string | undefined>(undefined);

  const requestUpgrade = useCallback(
    (options: RequestOptions = {}): boolean => {
      if (!isAnonymous) return false;

      let force = options.hardBlock ?? false;
      lastSnoozeKey.current = options.snoozeKey;

      if (options.snoozeKey && !force) {
        try {
          const key = SNOOZE_STORAGE_PREFIX + options.snoozeKey;
          const count = Number(localStorage.getItem(key) || '0');
          const max = options.maxSnooze ?? 2;
          if (count >= max) {
            // After snoozing N times the trigger turns into a hard block.
            force = true;
          }
        } catch {
          /* ignore storage errors */
        }
      }

      setHardBlock(force);
      setReason(options.reason);
      setOpen(true);
      return true;
    },
    [isAnonymous],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && !hardBlock && lastSnoozeKey.current) {
        // user dismissed → increment snooze counter for the last trigger key
        recordUpgradeSnooze(lastSnoozeKey.current);
      }
      setOpen(next);
    },
    [hardBlock],
  );

  return (
    <AnonymousUpgradeContext.Provider value={{ requestUpgrade, isAnonymous }}>
      {children}
      <UpgradeAccountDialog
        open={open}
        onOpenChange={handleOpenChange}
        hardBlock={hardBlock}
        reason={reason}
      />
    </AnonymousUpgradeContext.Provider>
  );
};

export function useAnonymousUpgrade(): AnonymousUpgradeContextValue {
  const ctx = useContext(AnonymousUpgradeContext);
  if (!ctx) {
    // Graceful fallback when the provider is not mounted (e.g. on /auth)
    return { requestUpgrade: () => false, isAnonymous: false };
  }
  return ctx;
}

/**
 * Imperative snooze helper for triggers — call from outside React when the
 * user dismisses a soft prompt so the counter advances.
 */
export function recordUpgradeSnooze(snoozeKey: string): void {
  try {
    const key = SNOOZE_STORAGE_PREFIX + snoozeKey;
    const count = Number(localStorage.getItem(key) || '0');
    localStorage.setItem(key, String(count + 1));
  } catch {
    /* ignore */
  }
}
