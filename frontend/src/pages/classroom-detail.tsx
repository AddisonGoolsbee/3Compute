import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router';
import { LogoBirdflop } from '@luminescent/ui-react';
import MonacoEditor from '@monaco-editor/react';
import {
  ArrowLeft, Copy, Check, Settings, Play,
  RefreshCw, Pause, PlayCircle, KeyRound, Pencil,
  FileText, ExternalLink, ChevronRight,
} from 'lucide-react';
import { apiUrl } from '../util/UserData';
import { languageMap } from '../util/languageMap';

interface StudentResult {
  passed: number;
  total: number;
}

interface Student {
  id: string;
  email: string;
  name: string;
  results: Record<string, StudentResult>;
}

interface ProgressData {
  students: Student[];
  templates: string[];
}

type GradingMode = 'equal' | 'weighted' | 'manual';

interface WeightsData {
  grading_mode: GradingMode;
  weights: Record<string, number>;
}

type ManualScores = Record<string, Record<string, number>>; // user_id -> template -> score

interface ClassroomInfo {
  id: string;
  name: string;
  access_code: string;
  joins_paused: boolean;
  grading_mode: GradingMode;
  participants: string[];
}

export default function ClassroomDetailPage() {
  const { id } = useParams();
  const [classroom, setClassroom] = useState<ClassroomInfo | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [weights, setWeights] = useState<WeightsData | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'gradebook'>('students');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [runningTests, setRunningTests] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const fetchClassroom = useCallback(async () => {
    const res = await fetch(`${apiUrl}/classrooms/`, { credentials: 'include' });
    const data = await res.json();
    const all = [...(data.owner ?? []), ...(data.joined ?? [])];
    const found = all.find((c: ClassroomInfo) => c.id === id);
    if (found) setClassroom(found);
  }, [id]);

  const fetchProgress = useCallback(async () => {
    const res = await fetch(`${apiUrl}/classrooms/${id}/progress`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setProgress(data);
      if (!selectedTemplate && data.templates.length > 0) {
        setSelectedTemplate(data.templates[0]);
      }
    }
  }, [id, selectedTemplate]);

  const fetchWeights = useCallback(async () => {
    const res = await fetch(`${apiUrl}/classrooms/${id}/weights`, { credentials: 'include' });
    if (res.ok) {
      setWeights(await res.json());
    }
  }, [id]);

  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    return () => { document.documentElement.style.overflowY = 'hidden'; };
  }, []);

  useEffect(() => {
    Promise.all([fetchClassroom(), fetchProgress(), fetchWeights()])
      .finally(() => setLoading(false));
  }, [fetchClassroom, fetchProgress, fetchWeights]);

  const runTests = async (templateName?: string) => {
    setRunningTests(true);
    try {
      await fetch(`${apiUrl}/classrooms/${id}/run-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ template_name: templateName ?? null }),
      });
      await fetchProgress();
    } finally {
      setRunningTests(false);
    }
  };

  const toggleJoins = async () => {
    if (!classroom) return;
    const res = await fetch(`${apiUrl}/classrooms/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ joins_paused: !classroom.joins_paused }),
    });
    if (res.ok) {
      setClassroom({ ...classroom, joins_paused: !classroom.joins_paused });
    }
    setSettingsOpen(false);
  };

  const regenerateCode = async () => {
    const res = await fetch(`${apiUrl}/classrooms/${id}/access-code`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (classroom) setClassroom({ ...classroom, access_code: data.access_code });
    }
    setSettingsOpen(false);
  };

  const submitRename = async () => {
    if (!renameValue.trim()) return;
    const res = await fetch(`${apiUrl}/classrooms/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    if (res.ok) {
      if (classroom) setClassroom({ ...classroom, name: renameValue.trim() });
    }
    setRenaming(false);
    setSettingsOpen(false);
  };

  const copyCode = () => {
    if (!classroom) return;
    navigator.clipboard.writeText(classroom.access_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const saveWeights = async (newWeights: WeightsData) => {
    setWeights(newWeights);
    try {
      const res = await fetch(`${apiUrl}/classrooms/${id}/weights`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newWeights),
      });
      if (res.ok) {
        const saved: WeightsData = await res.json();
        setWeights(saved);
      }
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="-mt-20 text-white min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="-mt-20 text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Classroom not found</p>
          <Link to="/classrooms" className="text-gray-300 hover:text-white transition-colors">Back to classrooms</Link>
        </div>
      </div>
    );
  }

  const formattedCode = classroom.access_code.length === 6
    ? `${classroom.access_code.slice(0, 3)}-${classroom.access_code.slice(3)}`
    : classroom.access_code;

  return (
    <div className="-mt-20 text-white min-h-screen flex flex-col">
      <header className="pt-24 pb-4 px-6">
        <div className="max-w-5xl mx-auto">
          <Link
            to="/classrooms"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            All Classrooms
          </Link>

          <div className="flex items-center justify-between">
            <div>
              {renaming ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRenaming(false); }}
                    className="text-2xl font-bold bg-transparent border-b border-gray-500 outline-none"
                    autoFocus
                  />
                  <button onClick={submitRename} className="text-sm text-green-400 hover:text-green-300">Save</button>
                  <button onClick={() => setRenaming(false)} className="text-sm text-gray-500 hover:text-gray-300">Cancel</button>
                </div>
              ) : (
                <h1 className="text-2xl font-bold">{classroom.name}</h1>
              )}
              <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-400">
                <button
                  onClick={copyCode}
                  className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
                  title="Copy join code"
                >
                  <span className="text-gray-600 text-xs">Join code</span>
                  <span className="font-mono text-gray-300 tracking-[0.12em] text-[13px]">{formattedCode}</span>
                  {copiedCode ? <Check size={13} className="text-green-400" /> : <Copy size={13} className="opacity-50" />}
                </button>
                <span className="text-gray-700">|</span>
                <span>{classroom.participants?.length ?? 0} {(classroom.participants?.length ?? 0) === 1 ? 'student' : 'students'}</span>
                {classroom.joins_paused && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400">Paused</span>
                )}
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
              >
                <Settings size={20} />
              </button>
              {settingsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[200px]">
                    <button
                      onClick={toggleJoins}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700/50 flex items-center gap-2.5 transition-colors"
                    >
                      {classroom.joins_paused ? <PlayCircle size={15} className="text-gray-400" /> : <Pause size={15} className="text-gray-400" />}
                      {classroom.joins_paused ? 'Resume joins' : 'Pause joins'}
                    </button>
                    <button
                      onClick={regenerateCode}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700/50 flex items-center gap-2.5 transition-colors"
                    >
                      <KeyRound size={15} className="text-gray-400" />
                      Regenerate code
                    </button>
                    <button
                      onClick={() => { setRenameValue(classroom.name); setRenaming(true); setSettingsOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700/50 flex items-center gap-2.5 transition-colors"
                    >
                      <Pencil size={15} className="text-gray-400" />
                      Rename
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 border-b border-gray-700/50">
            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'students'
                  ? 'border-white text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              Students
            </button>
            <button
              onClick={() => setActiveTab('gradebook')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'gradebook'
                  ? 'border-white text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              Gradebook
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 pb-20">
        <div className="max-w-5xl mx-auto mt-4">
          {activeTab === 'students' ? (
            <StudentsTab
              classroomId={id!}
              progress={progress}
              selectedTemplate={selectedTemplate}
              onSelectTemplate={setSelectedTemplate}
              onRunTests={runTests}
              runningTests={runningTests}
            />
          ) : (
            <GradebookTab
              classroomId={id!}
              progress={progress}
              weights={weights}
              onSaveWeights={saveWeights}
              onRunTests={runTests}
              runningTests={runningTests}
            />
          )}
        </div>
      </main>

      <footer className="border-t border-gray-700/50 py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoBirdflop size={20} fillGradient={['#54daf4', '#545eb6']} />
            <span className="text-gray-500 text-sm">3Compute</span>
          </div>
          <Link to="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">Home</Link>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Students Tab
// ---------------------------------------------------------------------------

function getMonacoLanguage(filename: string): string {
  const ext = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';
  for (const lang of Object.values(languageMap)) {
    if (lang.extensions.includes(ext)) return lang.language;
  }
  return 'plaintext';
}

function StudentsTab({
  classroomId,
  progress,
  selectedTemplate,
  onSelectTemplate,
  onRunTests,
  runningTests,
}: {
  classroomId: string;
  progress: ProgressData | null;
  selectedTemplate: string;
  onSelectTemplate: (t: string) => void;
  onRunTests: (t?: string) => void;
  runningTests: boolean;
}) {
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [studentFiles, setStudentFiles] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const toggleStudent = async (studentEmail: string) => {
    if (expandedStudent === studentEmail) {
      setExpandedStudent(null);
      setStudentFiles([]);
      setSelectedFile(null);
      setFileContent(null);
      return;
    }
    setExpandedStudent(studentEmail);
    setSelectedFile(null);
    setFileContent(null);
    setLoadingFiles(true);
    try {
      const res = await fetch(
        `${apiUrl}/classrooms/${classroomId}/student-files?email=${encodeURIComponent(studentEmail)}&template=${encodeURIComponent(selectedTemplate)}`,
        { credentials: 'include' },
      );
      if (res.ok) {
        const data = await res.json();
        // Filter out hidden files (starting with .)
        setStudentFiles((data.files as string[]).filter((f) => !f.split('/').some((seg) => seg.startsWith('.') || seg === '__pycache__')));
      } else {
        setStudentFiles([]);
      }
    } catch {
      setStudentFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const viewFile = async (fileName: string) => {
    if (!expandedStudent) return;
    setSelectedFile(fileName);
    setFileContent(null);
    setLoadingContent(true);
    try {
      const path = `${selectedTemplate}/${fileName}`;
      const res = await fetch(
        `${apiUrl}/classrooms/${classroomId}/student-file?email=${encodeURIComponent(expandedStudent)}&path=${encodeURIComponent(path)}`,
        { credentials: 'include' },
      );
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content);
      } else {
        setFileContent('Failed to load file.');
      }
    } catch {
      setFileContent('Failed to load file.');
    } finally {
      setLoadingContent(false);
    }
  };

  // Collapse when switching templates
  useEffect(() => {
    setExpandedStudent(null);
    setStudentFiles([]);
    setSelectedFile(null);
    setFileContent(null);
  }, [selectedTemplate]);

  if (!progress || progress.templates.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>No assignments yet.</p>
        <p className="text-sm mt-1 text-gray-600">Upload templates to your classroom from the IDE.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Assignment selector as pill tabs */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {progress.templates.map((t) => (
            <button
              key={t}
              onClick={() => onSelectTemplate(t)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                selectedTemplate === t
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-gray-600">Scores update when you run tests</span>
          <button
            onClick={() => onRunTests(selectedTemplate)}
            disabled={runningTests}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {runningTests ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            {runningTests ? 'Running...' : 'Run Tests'}
          </button>
        </div>
      </div>

      {progress.students.length === 0 ? (
        <div className="text-center py-12 text-gray-600 text-sm">No students have joined yet.</div>
      ) : (
        <div className="flex flex-col">
          {progress.students.map((student) => {
            const result = student.results[selectedTemplate];
            const passed = result?.passed ?? 0;
            const total = result?.total ?? 0;
            const allPassing = total > 0 && passed === total;
            const isExpanded = expandedStudent === student.email;

            return (
              <div key={student.id}>
                {/* Student row */}
                <button
                  onClick={() => toggleStudent(student.email)}
                  className="w-full flex items-center gap-4 px-3 py-2.5 hover:bg-gray-800/20 rounded-lg transition-colors text-left"
                >
                  <span className="text-gray-500 transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : undefined }}>
                    <ChevronRight size={14} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{student.name || student.email}</span>
                    {student.name && (
                      <span className="text-xs text-gray-600">{student.email}</span>
                    )}
                  </div>
                  <span className={`font-mono text-sm tabular-nums ${allPassing ? 'text-green-400' : 'text-gray-500'}`}>
                    {passed}/{total}
                  </span>
                </button>

                {/* Expanded file browser */}
                {isExpanded && (
                  <div className="ml-8 mr-3 mb-3 border border-gray-800 rounded-lg overflow-hidden bg-gray-900/50">
                    {loadingFiles ? (
                      <div className="p-4 text-sm text-gray-500">Loading files...</div>
                    ) : studentFiles.length === 0 ? (
                      <div className="p-4 text-sm text-gray-600">No files found.</div>
                    ) : (
                      <div className="flex" style={{ height: selectedFile ? '360px' : 'auto' }}>
                        {/* File list */}
                        <div className={`${selectedFile ? 'w-48 border-r border-gray-800' : 'w-full'} overflow-y-auto flex-shrink-0`}>
                          {studentFiles.map((f) => (
                            <button
                              key={f}
                              onClick={() => viewFile(f)}
                              className={`w-full text-left px-3 py-1.5 text-sm truncate transition-colors flex items-center gap-2 ${
                                selectedFile === f
                                  ? 'bg-gray-800 text-white'
                                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                              }`}
                              title={f}
                            >
                              <FileText size={12} className="flex-shrink-0 opacity-50" />
                              <span className="truncate">{f}</span>
                            </button>
                          ))}
                        </div>

                        {/* Monaco preview */}
                        {selectedFile && (
                          <div className="flex-1 flex flex-col min-w-0">
                            <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800 flex-shrink-0">
                              <span className="text-xs text-gray-500 font-mono truncate">{selectedFile}</span>
                              <Link
                                to={`/ide?classroom=${classroomId}&student=${encodeURIComponent(student.email)}&file=${encodeURIComponent(selectedTemplate + '/' + selectedFile)}`}
                                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors shrink-0 ml-3 hover:no-underline!"
                              >
                                <ExternalLink size={11} />
                                Open in IDE
                              </Link>
                            </div>
                            <div className="flex-1 min-h-0">
                              {loadingContent ? (
                                <div className="p-4 text-sm text-gray-500">Loading...</div>
                              ) : (
                                <MonacoEditor
                                  height="100%"
                                  language={getMonacoLanguage(selectedFile)}
                                  value={fileContent ?? ''}
                                  theme="vs-dark"
                                  options={{
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    fontSize: 13,
                                    wordWrap: 'on',
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    lineNumbers: 'on',
                                    renderWhitespace: 'selection',
                                    bracketPairColorization: { enabled: true },
                                    padding: { top: 8 },
                                    domReadOnly: true,
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gradebook Tab
// ---------------------------------------------------------------------------

const GRADING_MODES: { value: GradingMode; label: string }[] = [
  { value: 'equal', label: 'Equal weights' },
  { value: 'weighted', label: 'Custom weights' },
  { value: 'manual', label: 'Manual scores' },
];

function GradebookTab({
  classroomId,
  progress,
  weights,
  onSaveWeights,
  onRunTests,
  runningTests,
}: {
  classroomId: string;
  progress: ProgressData | null;
  weights: WeightsData | null;
  onSaveWeights: (w: WeightsData) => void;
  onRunTests: (t?: string) => void;
  runningTests: boolean;
}) {
  const [localMode, setLocalMode] = useState<GradingMode>(weights?.grading_mode ?? 'equal');
  const [localWeights, setLocalWeights] = useState<Record<string, number>>(weights?.weights ?? {});
  const [manualScores, setManualScores] = useState<ManualScores>({});
  const [manualScoresLoaded, setManualScoresLoaded] = useState(false);

  useEffect(() => {
    if (weights) {
      setLocalMode(weights.grading_mode);
      setLocalWeights(weights.weights);
    }
  }, [weights]);

  // Fetch manual scores when mode is manual
  useEffect(() => {
    if (localMode !== 'manual' || manualScoresLoaded) return;
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/classrooms/${classroomId}/manual-scores`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setManualScores(data.scores ?? {});
        }
      } catch { /* ignore */ }
      setManualScoresLoaded(true);
    })();
  }, [localMode, classroomId, manualScoresLoaded]);

  if (!progress || progress.templates.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>No assignments yet.</p>
      </div>
    );
  }

  const templates = progress.templates;
  const showInputRow = localMode !== 'equal';

  const changeMode = (mode: GradingMode) => {
    setLocalMode(mode);
    if (mode === 'equal') {
      // Only save the mode — don't touch stored weights so they're
      // preserved if the teacher switches back.
      onSaveWeights({ grading_mode: mode, weights: {} });
    } else {
      const newWeights = { ...localWeights };
      for (const t of templates) {
        if (!(t in newWeights)) newWeights[t] = 100;
      }
      setLocalWeights(newWeights);
      onSaveWeights({ grading_mode: mode, weights: newWeights });
    }
  };

  const updateWeight = (template: string, value: number) => {
    const updated = { ...localWeights, [template]: value };
    setLocalWeights(updated);
    onSaveWeights({ grading_mode: localMode, weights: updated });
  };

  const saveManualScore = async (userId: string, template: string, score: number) => {
    setManualScores((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [template]: score },
    }));
    await fetch(`${apiUrl}/classrooms/${classroomId}/manual-score`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ user_id: userId, template_name: template, score }),
    });
  };

  const getWeightedAverage = (student: Student): string => {
    if (localMode === 'manual') {
      let totalPoints = 0;
      let earnedPoints = 0;
      for (const t of templates) {
        const total = localWeights[t] ?? 0;
        if (total === 0) continue;
        const score = manualScores[student.id]?.[t] ?? 0;
        totalPoints += total;
        earnedPoints += score;
      }
      if (totalPoints === 0) return '\u2014';
      return `${Math.round((earnedPoints / totalPoints) * 100)}%`;
    }

    let totalWeight = 0;
    let weightedSum = 0;
    for (const t of templates) {
      const w = localMode === 'equal' ? 1 : (localWeights[t] ?? 0);
      const result = student.results[t];
      if (!result || result.total === 0) continue;
      totalWeight += w;
      weightedSum += w * (result.passed / result.total);
    }
    if (totalWeight === 0) return '\u2014';
    return `${Math.round((weightedSum / totalWeight) * 100)}%`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        {/* Mode selector */}
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          {GRADING_MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => changeMode(m.value)}
              className={`px-3 py-1.5 text-xs transition-colors ${
                localMode === m.value
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {localMode !== 'manual' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600">Scores update when you run tests</span>
            <button
              onClick={() => onRunTests()}
              disabled={runningTests}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {runningTests ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              {runningTests ? 'Running...' : 'Run All Tests'}
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            {/* Group header row */}
            <tr className="bg-gray-800/40">
              <th className="sticky left-0 z-10 bg-gray-800/40 min-w-[180px]" />
              <th
                colSpan={templates.length}
                className="px-4 pt-3 pb-1 text-xs font-medium text-gray-500 uppercase tracking-wider text-center border-l border-gray-800/50"
              >
                Assignments
              </th>
              <th colSpan={localMode === 'manual' ? 2 : 1} className="border-l border-gray-800/50 min-w-[80px]" />
            </tr>
            {/* Assignment names row */}
            <tr className={`bg-gray-800/40 ${!showInputRow ? 'border-b border-gray-700/50' : ''}`}>
              {!showInputRow ? (
                <th className="text-left pl-8! pr-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-10 bg-gray-800/40 min-w-[180px]">
                  Student
                </th>
              ) : (
                <th className="sticky left-0 z-10 bg-gray-800/40 min-w-[180px]" />
              )}
              {templates.map((t) => (
                <th key={t} className="px-4 py-2 text-xs font-medium text-gray-400 text-center min-w-[90px] border-l border-gray-800/50">
                  <div className="truncate max-w-[120px] mx-auto normal-case tracking-normal" title={t}>{t}</div>
                </th>
              ))}
              {!showInputRow ? (
                <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center min-w-[80px] border-l border-gray-800/50">
                  Average
                </th>
              ) : (
                <>
                  <th className="border-l border-gray-800/50 min-w-[80px]" />
                  {localMode === 'manual' && <th className="border-l border-gray-800/50 min-w-[80px]" />}
                </>
              )}
            </tr>
            {/* Weights/totals row (custom weights or manual scores) */}
            {showInputRow && (
              <tr className="bg-gray-800/40 border-b border-gray-700/50">
                <th className="text-left pl-8! pr-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-10 bg-gray-800/40 min-w-[180px]">
                  Student
                </th>
                {templates.map((t) => (
                  <th key={t} className="px-4 py-1.5 text-center min-w-[90px] border-l border-gray-800/50">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-[10px] text-gray-600 font-normal normal-case tracking-normal">
                        {localMode === 'manual' ? 'Total' : 'Weight'}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={localWeights[t] ?? 0}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '' || /^\d*\.?\d*$/.test(v)) {
                            updateWeight(t, parseFloat(v) || 0);
                          }
                        }}
                        className="w-12 bg-gray-900 border border-gray-700 rounded-md px-1.5 py-1 text-xs text-center text-gray-300 outline-none focus:border-gray-500 transition-colors font-normal normal-case tracking-normal"
                        title={`${localMode === 'manual' ? 'Total' : 'Weight'} for ${t}`}
                      />
                    </div>
                  </th>
                ))}
                {localMode === 'manual' && (
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center min-w-[80px] border-l border-gray-800/50">
                    Total
                  </th>
                )}
                <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center min-w-[80px] border-l border-gray-800/50">
                  Average
                </th>
              </tr>
            )}
          </thead>
          <tbody>
            {progress.students.length === 0 ? (
              <tr>
                <td colSpan={templates.length + 2} className="text-center py-10 text-gray-600 text-sm">
                  No students have joined yet.
                </td>
              </tr>
            ) : (
              progress.students.map((student, i) => (
                <tr key={student.id} className={`${i !== progress.students.length - 1 ? 'border-b border-gray-800/50' : ''} hover:bg-gray-800/15 transition-colors`}>
                  <td className="py-2.5 pl-8! pr-4 sticky left-0 z-10 bg-gray-900">
                    <div className="text-sm truncate max-w-[180px]">{student.name || student.email}</div>
                  </td>
                  {templates.map((t) => {
                    if (localMode === 'manual') {
                      const score = manualScores[student.id]?.[t] ?? 0;
                      const total = localWeights[t] ?? 0;
                      return (
                        <td key={t} className="px-4 py-1.5 text-center">
                          <div className="inline-flex items-center gap-0 font-mono text-xs tabular-nums">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={score}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === '' || /^\d*\.?\d*$/.test(v)) {
                                  const num = parseFloat(v) || 0;
                                  setManualScores((prev) => ({
                                    ...prev,
                                    [student.id]: { ...prev[student.id], [t]: num },
                                  }));
                                }
                              }}
                              onBlur={() => {
                                saveManualScore(student.id, t, manualScores[student.id]?.[t] ?? 0);
                              }}
                              className={`w-10 bg-gray-900 border border-gray-700/50 rounded-md px-1 py-1 text-xs text-center outline-none focus:border-gray-500 transition-colors font-mono tabular-nums ${
                                total > 0 && score >= total ? 'text-green-400' : 'text-gray-400'
                              }`}
                            />
                            <span className="text-gray-600 ml-0.5">/{total || 0}</span>
                          </div>
                        </td>
                      );
                    }
                    const r = student.results[t];
                    const passed = r?.passed ?? 0;
                    const total = r?.total ?? 0;
                    const allPassing = total > 0 && passed === total;
                    return (
                      <td key={t} className="px-4 py-2.5 text-center">
                        <span className={`font-mono text-xs tabular-nums ${allPassing ? 'text-green-400' : 'text-gray-500'}`}>
                          {passed}/{total}
                        </span>
                      </td>
                    );
                  })}
                  {localMode === 'manual' && (() => {
                    let earned = 0;
                    let possible = 0;
                    for (const t of templates) {
                      const total = localWeights[t] ?? 0;
                      const score = manualScores[student.id]?.[t] ?? 0;
                      earned += score;
                      possible += total;
                    }
                    return (
                      <td className="px-4 py-2.5 text-center border-l border-gray-800/50">
                        <span className={`font-mono text-xs tabular-nums ${possible > 0 && earned >= possible ? 'text-green-400' : 'text-gray-400'}`}>
                          {earned}/{possible}
                        </span>
                      </td>
                    );
                  })()}
                  <td className="px-4 py-2.5 text-center">
                    <span className="font-mono text-xs tabular-nums text-gray-400">
                      {getWeightedAverage(student)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
