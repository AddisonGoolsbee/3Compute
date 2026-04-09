import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router';
import { LogoBirdflop } from '@luminescent/ui-react';
import { ArrowLeft, Copy, Check, Users, ChevronRight, Plus, LogIn } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import CreateClassroomDialog from '../components/CreateClassroomDialog';
import JoinClassroomDialog from '../components/JoinClassroomDialog';

interface Classroom {
  id: string;
  name: string;
  access_code: string;
  participants?: string[];
  instructors?: string[];
  joins_paused?: boolean;
}

function formatCode(code: string) {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

export default function ClassroomsPage() {
  const userData = useContext(UserDataContext);
  const [owned, setOwned] = useState<Classroom[]>([]);
  const [joined, setJoined] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const isTeacher = userData?.userInfo?.role === 'teacher';

  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    return () => {
      document.documentElement.style.overflowY = 'hidden';
    };
  }, []);

  const fetchClassrooms = () => {
    fetch(`${apiUrl}/classrooms/`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setOwned(data.owner ?? []);
        setJoined(data.joined ?? []);
      })
      .catch(() => { setOwned([]); setJoined([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!userData?.userInfo) return;
    fetchClassrooms();
  }, [userData?.userInfo]);

  const copyCode = (e: React.MouseEvent, classroom: Classroom) => {
    e.stopPropagation();
    e.preventDefault();
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
              <h1 className="text-3xl font-bold mb-1">Classrooms</h1>
              <p className="text-gray-400">
                {isTeacher ? 'Manage your classrooms and view student progress.' : 'Your classrooms.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setJoinOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-700 hover:border-gray-500 text-sm font-medium transition-colors text-gray-300 hover:text-white"
              >
                <LogIn size={15} />
                Join
              </button>
              {isTeacher && (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-medium transition-colors"
                >
                  <Plus size={15} />
                  Create
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-20 text-gray-500">Loading...</div>
          ) : owned.length === 0 && joined.length === 0 ? (
            <div className="text-center py-20">
              <Users size={48} className="mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 mb-2">No classrooms yet.</p>
              <p className="text-gray-500 text-sm mb-6">
                {isTeacher
                  ? 'Create a classroom or join one with an access code.'
                  : 'Join a classroom with an access code from your teacher.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-800/60">
              {owned.map((classroom) => (
                <Link
                  key={classroom.id}
                  to={`/classrooms/${classroom.id}`}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-gray-800/40 transition-colors group hover:no-underline!"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold truncate group-hover:text-white transition-colors">{classroom.name}</h2>
                      {classroom.joins_paused && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400">
                          Paused
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Users size={13} />
                        {classroom.participants?.length ?? 0} {(classroom.participants?.length ?? 0) === 1 ? 'student' : 'students'}
                      </span>
                      <span className="text-gray-700">|</span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-gray-600 text-xs">Join code</span>
                        <span className="font-mono text-gray-400 tracking-[0.12em] text-[13px]">{formatCode(classroom.access_code)}</span>
                        <button
                          onClick={(e) => copyCode(e, classroom)}
                          className="p-0.5 rounded hover:bg-gray-700 transition-colors text-gray-600 hover:text-white"
                          title="Copy join code"
                        >
                          {copiedId === classroom.id ? (
                            <Check size={12} className="text-green-400" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
                </Link>
              ))}
              {joined.length > 0 && owned.length > 0 && (
                <div className="border-t border-gray-700/50" />
              )}
              {joined.map((classroom) => (
                <div
                  key={classroom.id}
                  className="flex items-center gap-4 px-4 py-4"
                >
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold truncate">{classroom.name}</h2>
                    <span className="text-sm text-gray-600">Joined</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-700/50 py-8 px-6">
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

      <CreateClassroomDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); fetchClassrooms(); }}
      />
      <JoinClassroomDialog
        open={joinOpen}
        onClose={() => { setJoinOpen(false); fetchClassrooms(); }}
      />
    </div>
  );
}
