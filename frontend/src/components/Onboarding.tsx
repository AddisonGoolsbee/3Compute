import { useState, useEffect } from 'react';
import LogoCsRoom from './LogoCsRoom';
import { BookOpen, GraduationCap } from 'lucide-react';
import { apiUrl } from '../util/UserData';
import { PrimaryButton } from './ui/Buttons';

export default function Onboarding() {
  const [loading, setLoading] = useState(false);
  const [allowedRoles, setAllowedRoles] = useState<string[] | null>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper p-8">
      <div className="bg-paper-elevated border border-rule rounded-xl p-10 max-w-[460px] w-full text-center shadow-md">
        <div className="mb-5 mx-auto inline-flex">
          <LogoCsRoom size={56} />
        </div>
        <h1 className="heading-1 mt-2 mb-2.5">Welcome to CS Room</h1>

        {allowedRoles === null ? (
          <p className="body text-ink-muted">Loading…</p>
        ) : allowedRoles.length === 0 ? (
          <div className="flex flex-col items-center gap-3">
            <p className="body text-ink-muted">You don't have access to any roles yet.</p>
            <p className="body text-ink-muted">
              Contact{' '}
              <a href="mailto:csroom@birdflop.com" className="text-navy font-semibold no-underline">
                csroom@birdflop.com
              </a>{' '}
              to request access.
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
