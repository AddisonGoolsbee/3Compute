import { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router';
import { LogoBirdflop } from '@luminescent/ui-react';
import { ArrowLeft, Copy, Check, Users, Plus, BookOpen } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';

interface Classroom {
  id: string;
  name: string;
  access_code: string;
  member_count?: number;
}

export default function ClassroomsPage() {
  const userData = useContext(UserDataContext);
  const navigate = useNavigate();
  const [owned, setOwned] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    return () => {
      document.documentElement.style.overflowY = 'hidden';
    };
  }, []);

  useEffect(() => {
    if (userData?.userInfo && userData.userInfo.role !== 'teacher') {
      navigate('/ide', { replace: true });
    }
  }, [userData?.userInfo, navigate]);

  useEffect(() => {
    fetch(`${apiUrl}/classrooms/`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setOwned(data.owner ?? []);
      })
      .catch(() => setOwned([]))
      .finally(() => setLoading(false));
  }, []);

  const copyCode = (classroom: Classroom) => {
    navigator.clipboard.writeText(classroom.access_code);
    setCopiedId(classroom.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="-mt-20 text-white min-h-screen flex flex-col">
      <header className="pt-24 pb-6 px-6">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/ide"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            Back to IDE
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">My Classrooms</h1>
              <p className="text-gray-400">Manage your classrooms and share access codes with students.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-20 text-gray-500">Loading...</div>
          ) : owned.length === 0 ? (
            <div className="text-center py-20">
              <Users size={48} className="mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 mb-2">No classrooms yet.</p>
              <p className="text-gray-500 text-sm mb-6">
                Create your first classroom from the IDE using the &ldquo;Create Classroom&rdquo; button in the top navigation.
              </p>
              <Link
                to="/ide"
                className="lum-btn lum-pad-sm rounded-lg bg-[#54daf4] hover:bg-[#3cc8e2] text-gray-950 font-medium text-sm inline-flex items-center gap-2 transition-colors"
              >
                Go to IDE
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {owned.map((classroom) => (
                <div
                  key={classroom.id}
                  className="lum-card border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h2 className="text-lg font-semibold leading-tight">{classroom.name}</h2>
                  </div>

                  {/* Access code */}
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 mb-1">Student access code</div>
                    <div className="flex items-center gap-2">
                      <code className="text-lg font-mono font-bold text-[#54daf4] tracking-widest">
                        {classroom.access_code}
                      </code>
                      <button
                        onClick={() => copyCode(classroom)}
                        className="p-1.5 rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
                        title="Copy code"
                      >
                        {copiedId === classroom.id ? (
                          <Check size={14} className="text-green-400" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to="/ide"
                      className="lum-btn lum-pad-sm rounded-lg border border-gray-600 hover:border-gray-400 text-sm inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Plus size={13} />
                      Open in IDE
                    </Link>
                    <Link
                      to="/lessons"
                      className="lum-btn lum-pad-sm rounded-lg border border-gray-600 hover:border-[#54daf4]/50 text-sm inline-flex items-center gap-1.5 transition-colors"
                    >
                      <BookOpen size={13} />
                      Add a lesson
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-700 py-8 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoBirdflop size={20} fillGradient={['#54daf4', '#545eb6']} />
            <span className="text-gray-500 text-sm">3Compute</span>
          </div>
          <Link to="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
