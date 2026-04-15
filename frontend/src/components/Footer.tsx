import { Link } from 'react-router';
import { LogoBirdflop } from '@luminescent/ui-react';

export default function Footer() {
  return (
    <footer className="border-t border-gray-700/50 py-10 px-6">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <LogoBirdflop size={20} fillGradient={['#54daf4', '#545eb6']} />
          <span className="text-gray-400 text-sm">3Compute by Birdflop</span>
        </div>
        <p className="text-gray-600 text-xs text-center">
          &copy; 2025&ndash;2026 Birdflop. All rights reserved. Birdflop is a registered 501(c)(3) nonprofit organization (EIN: 93-2401009).
        </p>
        <Link to="/terms" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
          Terms of Service &amp; Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
