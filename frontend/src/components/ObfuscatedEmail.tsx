import type { MouseEvent, ReactNode } from 'react';
import { Mail } from 'lucide-react';

// Renders the contact email so it reads normally for humans while keeping
// it out of static HTML and the contiguous-string bundle source.
//
// Two layers of protection:
// 1. The site runs in SPA mode (no SSR), so the static HTML at /about and
//    /terms is empty until JS hydrates — non-JS spam scrapers see nothing.
// 2. The address is assembled at runtime from separate string constants;
//    `csroom@birdflop.com` never appears as a contiguous literal anywhere
//    in the bundled source, so bots that grep the JS bundle for an email
//    pattern miss it too.
//
// What this does NOT defend against: a bot that runs the SPA, hydrates it,
// and reads textContent. Googlebot does this — which is intentional, since
// the page content is meant to be indexable. If you ever need to hide the
// address from Google as well, switch to a click-to-reveal flow.

const USER = 'csroom';
const DOMAIN_PARTS = ['birdflop', 'com'];

function buildAddress(): string {
  // String.fromCharCode keeps "@" out of any literal in the bundled source.
  return `${USER}${String.fromCharCode(0x40)}${DOMAIN_PARTS.join('.')}`;
}

interface Props {
  className?: string;
  icon?: boolean;
  children?: ReactNode;
}

export default function ObfuscatedEmail({
  className = '',
  icon = false,
  children,
}: Props) {
  const address = buildAddress();
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.location.href = `mailto:${address}`;
  };
  return (
    <a
      href="#contact"
      onClick={handleClick}
      className={className}
    >
      {icon && <Mail size={15} className="inline-block mr-1.5 -mt-0.5" aria-hidden />}
      {children ?? address}
    </a>
  );
}
