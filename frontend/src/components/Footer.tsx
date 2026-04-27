import { Link } from 'react-router';
import { LogoBirdflop } from '@luminescent/ui-react';

export default function Footer() {
  return (
    <footer className="px-7 py-10 border-t border-rule-soft bg-paper-tinted">
      <div className="max-w-[1100px] mx-auto flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <LogoBirdflop size={22} fillGradient={['#54daf4', '#545eb6']} />
          <span className="font-sans font-semibold text-ink-strong tracking-tight">3Compute</span>
        </div>
        <p className="body-sm flex-1 min-w-[260px] max-w-[520px] m-0">
          A free coding classroom from Birdflop, a 501(c)(3) nonprofit (EIN: 93-2401009).
        </p>
        <div className="flex items-center gap-5 text-xs text-ink-subtle shrink-0">
          <span>© 2026 Birdflop</span>
          <Link
            to="/terms"
            className="text-ink-subtle no-underline hover:text-ink-default transition-colors"
          >
            Terms &amp; Privacy
          </Link>
          <a
            href="https://www.paypal.com/US/fundraiser/charity/5036975"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-subtle no-underline hover:text-tomato transition-colors"
          >
            Donate
          </a>
        </div>
      </div>
    </footer>
  );
}
