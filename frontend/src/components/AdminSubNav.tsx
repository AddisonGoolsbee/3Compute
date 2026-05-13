import { Link } from 'react-router';
import { cn } from '../util/cn';

const TABS: Array<{ label: string; to: string }> = [
  { label: 'Overview', to: '/admin' },
  { label: 'Users', to: '/admin/users' },
  { label: 'Classrooms', to: '/admin/classrooms' },
  { label: 'Containers', to: '/admin/containers' },
  { label: 'Access requests', to: '/admin/access-requests' },
  { label: 'Allowlist', to: '/admin/allowlist' },
  { label: 'Signup codes', to: '/admin/signup-codes' },
  { label: 'Logs', to: '/admin/logs' },
];

export default function AdminSubNav({ active }: { active: string }) {
  return (
    <nav aria-label="Admin sections" className="flex flex-wrap gap-1 mb-7 border-b border-rule-soft">
      {TABS.map((tab) => {
        const isActive = tab.to === active;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'px-4 py-2.5 border-b-2 -mb-px text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 rounded-sm',
              isActive
                ? 'border-navy text-ink-strong'
                : 'border-transparent text-ink-muted hover:text-ink-strong',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
