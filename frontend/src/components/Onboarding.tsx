import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import LogoCsRoom from './LogoCsRoom';
import { BookOpen, GraduationCap, KeyRound } from 'lucide-react';
import { apiUrl } from '../util/UserData';
import { PrimaryButton } from './ui/Buttons';

export default function Onboarding() {
  const [loading, setLoading] = useState(false);
  const [allowedRoles, setAllowedRoles] = useState<string[] | null>(null);
  const [code, setCode] = useState('');
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    fetch(`${apiUrl}/users/allowed-roles`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setAllowedRoles(data.roles))
      .catch(() => setAllowedRoles([]));
  }, []);

  const selectRole = async (role: 'teacher' | 'student') => {
    setLoading(true);
    await fetch(`${apiUrl}/users/role`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    window.location.href = '/ide';
  };

  const redeemCode = async () => {
    if (!code.trim() || redeeming) return;
    setRedeeming(true);
    setRedeemError(null);
    try {
      const res = await fetch(`${apiUrl}/users/redeem-code`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'That code didn\'t work');
      }
      window.location.href = '/ide';
    } catch (e) {
      setRedeemError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper p-8">
      <div className="bg-paper-elevated border border-rule rounded-xl p-10 max-w-[460px] w-full text-center shadow-md">
        <div className="mb-5 mx-auto inline-flex">
          <LogoCsRoom size={56} />
        </div>
        <h1 className="heading-1 mt-2 mb-2.5">
          Welcome to<br />CS Room
        </h1>

        {allowedRoles === null ? (
          <p className="body text-ink-muted">Loading…</p>
        ) : allowedRoles.length === 0 ? (
          <div className="flex flex-col gap-5 mt-5 text-left">
            <p className="body text-ink-muted text-center">
              You don't have access yet. If you have a signup code, enter it below.
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-ink-strong" htmlFor="signup-code">
                Signup code
              </label>
              <input
                id="signup-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') redeemCode(); }}
                placeholder="XXXX-XXXX-XXXX"
                autoComplete="off"
                spellCheck={false}
                className="px-3 py-2.5 bg-paper border border-rule rounded-md text-ink-strong text-[15px] font-mono tracking-wide focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/15 transition-colors text-center"
              />
              {redeemError && (
                <p className="text-sm text-tomato">{redeemError}</p>
              )}
              <PrimaryButton
                color="navy"
                size="md"
                icon={<KeyRound size={16} />}
                onClick={redeemCode}
                disabled={!code.trim() || redeeming}
                className="w-full justify-center mt-1"
              >
                {redeeming ? 'Checking…' : 'Use code'}
              </PrimaryButton>
            </div>

            <div className="flex items-center gap-3 text-xs text-ink-faint">
              <span className="flex-1 h-px bg-rule-soft" />
              <span>OR</span>
              <span className="flex-1 h-px bg-rule-soft" />
            </div>

            <p className="body text-ink-muted text-center">
              Teachers without a code can{' '}
              <Link to="/request-access" className="text-navy font-semibold no-underline">
                request access
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <p className="body text-ink-muted mb-7">Are you a teacher or a student?</p>
            <div className="flex flex-col gap-3 w-full">
              {allowedRoles.includes('teacher') && (
                <PrimaryButton
                  color="navy"
                  size="lg"
                  icon={<GraduationCap size={18} />}
                  onClick={() => selectRole('teacher')}
                  disabled={loading}
                  className="w-full justify-center"
                >
                  I'm a teacher
                </PrimaryButton>
              )}
              {allowedRoles.includes('student') && (
                <PrimaryButton
                  color="forest"
                  size="lg"
                  icon={<BookOpen size={18} />}
                  onClick={() => selectRole('student')}
                  disabled={loading}
                  className="w-full justify-center"
                >
                  I'm a student
                </PrimaryButton>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
