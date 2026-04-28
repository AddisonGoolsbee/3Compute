import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, Terminal } from 'lucide-react';
import ClassroomDetailPage from './classroom-detail';

/** Dashboard half of the public demo. Renders the read-only
 *  ClassroomDetailPage (Students/Gradebook/Assignments) with a sticky
 *  banner that links back to the workspace IDE. */

export default function DemoDashboardPage() {
  return (
    <>
      <div className="bg-navy-soft border-b border-navy/20 px-4 sm:px-7 py-2.5">
        <div className="max-w-[1480px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className="eyebrow text-navy">Demo classroom dashboard</span>
            <span className="body-sm text-ink-default">
              The teacher's view of student progress. Read-only.
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              to="/demo"
              className="text-navy hover:text-navy/80 font-semibold inline-flex items-center gap-1.5 text-sm no-underline px-3 py-1 rounded-md hover:bg-navy/10 transition-colors"
            >
              <ArrowLeft size={14} />
              <Terminal size={14} />
              Back to workspace
            </Link>
            <Link
              to="/request-access"
              className="text-navy hover:text-navy/80 font-semibold inline-flex items-center gap-1 text-sm no-underline"
            >
              Sign up
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
      <ClassroomDetailPage demoMode classroomIdOverride="demo" />
    </>
  );
}
