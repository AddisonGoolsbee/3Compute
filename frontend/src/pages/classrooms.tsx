import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Copy, Check, Users, ChevronRight, Plus, LogIn, ExternalLink, FileText, FolderOpen } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import CreateClassroomDialog from '../components/CreateClassroomDialog';
import JoinClassroomDialog from '../components/JoinClassroomDialog';
import AssignmentBrowserDialog from '../components/AssignmentBrowserDialog';
import Footer from '../components/Footer';

interface Classroom {
  id: string;
  name: string;
  access_code: string;
  participants?: string[];
  instructors?: string[];
  joins_paused?: boolean;
}

interface ClassroomAssignments {
  id: string;
  name: string;
  templates: { name: string; files: string[] }[];
}

function formatCode(code: string) {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

export default function ClassroomsPage() {
  const userData = useContext(UserDataContext);
  const [owned, setOwned] = useState<Classroom[]>([]);
  const [joined, setJoined] = useState<Classroom[]>([]);
  const [assignmentsByClassroom, setAssignmentsByClassroom] = useState<Record<string, ClassroomAssignments['templates']>>({});
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [browsingAssignment, setBrowsingAssignment] = useState<
    { classroomId: string; templateName: string; files: string[] } | null
  >(null);

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
    // Pull assignment lists for every classroom the user is in so joined
    // (student) rows can show direct "Open in IDE" links straight into
    // each assignment folder.
    fetch(`${apiUrl}/classrooms/assignments`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, ClassroomAssignments['templates']> = {};
        const classrooms: ClassroomAssignments[] = Array.isArray(data.classrooms) ? data.classrooms : [];
        for (const c of classrooms) map[c.id] = c.templates ?? [];
        setAssignmentsByClassroom(map);
      })
      .catch(() => setAssignmentsByClassroom({}));
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
                {isTeacher ? 'Manage your classrooms and view student progress' : 'Your classrooms'}
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
              {joined.map((classroom) => {
                const assignments = assignmentsByClassroom[classroom.id] ?? [];
                return (
                  <div key={classroom.id} className="px-4 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold truncate">{classroom.name}</h2>
                        <span className="text-sm text-gray-600">Joined</span>
                      </div>
                      <Link
                        to={`/ide?classroom=${classroom.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-[#54daf4]/15 text-[#54daf4] hover:bg-[#54daf4]/25 transition-colors"
                        title="Open this classroom in the IDE"
                      >
                        <ExternalLink size={14} />
                        Open in IDE
                      </Link>
                    </div>
                    {assignments.length > 0 && (
                      <div className="mt-3 ml-0 flex flex-col gap-1">
                        {assignments.map((t) => (
                          <div
                            key={t.name}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/60 transition-colors group cursor-pointer"
                            onClick={() =>
                              setBrowsingAssignment({
                                classroomId: classroom.id,
                                templateName: t.name,
                                files: t.files,
                              })
                            }
                            title={`Browse "${t.name}" files and restore originals`}
                          >
                            <FileText size={14} className="text-gray-500 group-hover:text-gray-300 shrink-0" />
                            <span className="text-sm text-gray-300 truncate flex-1">{t.name}</span>
                            <span className="text-xs text-gray-600">
                              {t.files.length} {t.files.length === 1 ? 'file' : 'files'}
                            </span>
                            <FolderOpen size={13} className="text-gray-600 group-hover:text-gray-400 shrink-0" />
                            <Link
                              to={`/ide?classroom=${classroom.id}&folder=${encodeURIComponent(t.name)}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-[#54daf4] hover:bg-[#54daf4]/10"
                              title={`Open "${t.name}" in the IDE`}
                            >
                              <ExternalLink size={11} />
                              IDE
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <CreateClassroomDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); fetchClassrooms(); }}
      />
      <JoinClassroomDialog
        open={joinOpen}
        onClose={() => { setJoinOpen(false); fetchClassrooms(); }}
      />
      {browsingAssignment && (
        <AssignmentBrowserDialog
          open={true}
          classroomId={browsingAssignment.classroomId}
          templateName={browsingAssignment.templateName}
          files={browsingAssignment.files}
          onClose={() => setBrowsingAssignment(null)}
        />
      )}
    </div>
  );
}
