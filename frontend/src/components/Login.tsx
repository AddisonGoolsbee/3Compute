import { LogoBirdflop } from '@luminescent/ui-react';
import { apiUrl } from '../util/UserData';

export default function Login() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-8">
      <div className="max-w-[460px] w-full bg-paper-elevated border border-rule rounded-xl p-12 shadow-md">
        <LogoBirdflop size={56} fillGradient={['#54daf4', '#545eb6']} />
        <h1 className="heading-1 mt-5 mb-2.5 whitespace-nowrap">Welcome back</h1>
        <p className="body mb-7 text-ink-muted">
          Sign in with Google to access your workspace and classrooms.
        </p>
        <a
          href={`${apiUrl}/auth/login`}
          className="bg-navy text-white border-0 px-5 py-3.5 rounded-md text-[15px] font-semibold inline-flex items-center gap-3 justify-center w-full shadow-cta cursor-pointer hover:brightness-105 transition-[filter] duration-150 no-underline"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" className="bg-white rounded-[3px] p-px">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </a>
        <p className="body-sm mt-5 text-ink-subtle text-[13px]">
          New here? An account is created automatically the first time you sign in. Free, always.
        </p>
      </div>
    </div>
  );
}
