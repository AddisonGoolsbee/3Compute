import { ShieldOff } from 'lucide-react';

export default function AdminRestricted() {
  return (
    <div className="max-w-[420px] mx-auto mt-32 bg-paper-elevated border border-rule-soft rounded-xl shadow-sm p-8 text-center">
      <ShieldOff size={32} className="mx-auto mb-3 text-ink-faint" />
      <h2 className="heading-3 mb-2">Admins only</h2>
      <p className="body-sm">You don't have permission to view this page.</p>
    </div>
  );
}
