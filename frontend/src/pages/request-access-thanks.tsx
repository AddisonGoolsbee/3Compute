import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import Footer from '../components/Footer';
import { SubmittedCard } from './request-access';

// Dedicated landing for the public access-request flow so Google Ads can fire
// a destination-based conversion. Teachers requesting more access from inside
// the app never reach this URL.
export default function RequestAccessThanksPage() {
  const location = useLocation();
  const state = (location.state || {}) as { email?: string; isNonGoogle?: boolean };
  const email = state.email || '';
  const isNonGoogle = !!state.isNonGoogle;

  useEffect(() => {
    const prev = document.documentElement.style.overflowY;
    document.documentElement.style.overflowY = 'auto';
    return () => { document.documentElement.style.overflowY = prev; };
  }, []);

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <main className="flex-1 flex items-start justify-center px-6 py-14">
        <div className="w-full max-w-[640px]">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted no-underline hover:text-ink-strong mb-6"
          >
            <ArrowLeft size={14} />
            Back home
          </Link>

          <SubmittedCard email={email} isNonGoogle={isNonGoogle} isTeacher={false} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
