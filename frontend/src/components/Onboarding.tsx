import { useState, useEffect } from 'react';
import { LogoBirdflop } from '@luminescent/ui-react';
import { BookOpen, GraduationCap } from 'lucide-react';
import { apiUrl } from '../util/UserData';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg">
      <div className="flex flex-col items-center text-center max-w-md px-6">
        <LogoBirdflop size={64} fillGradient={['#54daf4', '#545eb6']} className="mb-6" />
        <h1 className="text-2xl font-bold mb-2">Welcome to 3Compute</h1>

        {allowedRoles === null ? (
          <p className="text-lum-text-secondary">Loading...</p>
        ) : allowedRoles.length === 0 ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-lum-text-secondary">You don't have access to any roles yet.</p>
            <p className="text-lum-text-secondary">
              Contact{' '}
              <a href="mailto:3compute@birdflop.com" className="text-[#54daf4] hover:underline">
                3compute@birdflop.com
              </a>{' '}
              to request access.
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-400 mb-10">Are you a teacher or a student?</p>
            <div
              className={`grid gap-4 w-full ${allowedRoles.length === 1 ? 'grid-cols-1 max-w-xs' : 'grid-cols-2'}`}
            >
              {allowedRoles.includes('teacher') && (
                <button
                  disabled={loading}
                  onClick={() => selectRole('teacher')}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border border-gray-700 hover:border-[#54daf4]/60 hover:bg-[#54daf4]/5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <BookOpen size={32} className="text-[#54daf4]" />
                  <div>
                    <div className="font-semibold text-base">Teacher</div>
                    <div className="text-xs text-gray-400 mt-0.5">Create classrooms and import lessons</div>
                  </div>
                </button>
              )}
              {allowedRoles.includes('student') && (
                <button
                  disabled={loading}
                  onClick={() => selectRole('student')}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border border-gray-700 hover:border-[#54daf4]/60 hover:bg-[#54daf4]/5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <GraduationCap size={32} className="text-[#54daf4]" />
                  <div>
                    <div className="font-semibold text-base">Student</div>
                    <div className="text-xs text-gray-400 mt-0.5">Join a classroom and start coding</div>
                  </div>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
