import { useEffect, useState } from 'react';
import { apiUrl } from './UserData';

/**
 * Verifies admin status against the server (`/admin/me`). Don't trust
 * `userInfo.is_admin` from `/auth/me` — a tampered client could set it.
 *
 * Returns `null` while the verification is pending, then `true`/`false`.
 */
export function useVerifiedAdmin(enabled: boolean): boolean | null {
  const [verified, setVerified] = useState<boolean | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch(`${apiUrl}/admin/me`, { credentials: 'include' })
      .then((r) => { if (!cancelled) setVerified(r.ok); })
      .catch(() => { if (!cancelled) setVerified(false); });
    return () => { cancelled = true; };
  }, [enabled]);
  return verified;
}
