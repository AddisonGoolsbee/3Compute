import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import MonacoEditor, { type OnMount } from '@monaco-editor/react';
import { setupDaylightTheme, DAYLIGHT_THEME } from '../util/monacoTheme';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  File,
  FileText,
  FlaskConical,
  Play,
  Printer,
  RefreshCw,
  X,
} from 'lucide-react';
import { printMarkdownElement } from '../util/printMarkdown';
import { apiUrl, UserDataContext } from '../util/UserData';
import { languageMap } from '../util/languageMap';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Files, FileType } from '../util/Files';
import { PrimaryButton } from './ui/Buttons';
import { cn } from '../util/cn';

function findDefaultFile(files: Files): FileType | undefined {
  const defaultFileNames = ['readme', 'index.'];

  // First pass: only top-level personal files (skip classroom folders)
  for (const fileName of defaultFileNames) {
    for (const item of files) {
      if (!('files' in item) && !item.classroomId && item.name.toLowerCase().startsWith(fileName.toLowerCase())) {
        return item;
      }
    }
  }

  // Second pass: recurse into personal folders only
  for (const item of files) {
    if ('files' in item && item.files && !item.classroomId) {
      const foundFile = findDefaultFile(item.files);
      if (foundFile) return foundFile;
    }
  }

  // Third pass: fall back to classroom files if nothing else found
  for (const fileName of defaultFileNames) {
    for (const item of files) {
      if (!('files' in item) && item.classroomId && item.name.toLowerCase().startsWith(fileName.toLowerCase())) {
        return item;
      }
    }
  }
  for (const item of files) {
    if ('files' in item && item.files && item.classroomId) {
      const foundFile = findDefaultFile(item.files);
      if (foundFile) return foundFile;
    }
  }

  return undefined;
}

const runCommandMap: Partial<Record<keyof typeof languageMap, (location: string) => string>> = {
  python: (loc) => `python3 "/app${loc}"\n`,
  javascript: (loc) => `node "/app${loc}"\n`,
};

const MAX_EDITOR_LINES = 10_000;
// Upper bound on total characters too, so a single massive-line file
// (minified bundles, generated blobs) can't sneak past the line check.
// ~100 chars/line × 10k lines = 1M chars, which is already comfortably
// above anything humans write by hand.
const MAX_EDITOR_CHARS = 1_000_000;

function isImageFile(filename: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'];
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? imageExtensions.includes(ext) : false;
}

function isBinaryFile(filename: string): boolean {
  const binaryExtensions = [
    'pyc', 'pyo', 'pyd', 'so', 'o', 'a', 'lib', 'dll', 'exe', 'bin',
    'pdf', 'zip', 'tar', 'gz', 'bz2', '7z', 'rar', 'xz', 'zst',
    'db', 'sqlite', 'sqlite3', 'whl', 'egg', 'class', 'jar', 'war',
    'dat', 'pkl', 'pickle', 'npy', 'npz', 'h5', 'hdf5',
    'mp3', 'mp4', 'wav', 'ogg', 'flac', 'avi', 'mov', 'mkv',
  ];
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? binaryExtensions.includes(ext) : false;
}

export default function Editor() {
  const [value, setValue] = useState('');
  const [mdPreview, setMdPreview] = useState<boolean>(true);
  const [currentLanguage, setCurrentLanguage] = useState<keyof typeof languageMap>('javascript');
  const [isImage, setIsImage] = useState<boolean>(false);
  const [isBinary, setIsBinary] = useState<boolean>(false);
  const [isTooLarge, setIsTooLarge] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{ passed: number; total: number } | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const editorRef = useRef<unknown>(null);
  const markdownRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentFileLocationRef = useRef<string | undefined>(undefined);
  const lastSavedValueRef = useRef<string>('');
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => { setIsClient(true); }, []);

  const saveFile = useCallback(async (location: string, content: string) => {
    setSaveStatus('saving');
    try {
      const response = await fetch(`${apiUrl}/files/file${location}`, {
        method: 'PUT',
        body: content,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        credentials: 'include',
      });
      if (!response.ok) {
        setSaveStatus('error');
      } else {
        lastSavedValueRef.current = content;
        // Stay on "Saved" until the next edit flips it back to "Saving…".
        setSaveStatus('saved');
        broadcastChannelRef.current?.postMessage({ type: 'file-saved', location });
      }
    } catch {
      setSaveStatus('error');
    }
  }, []);

  const onChange = useCallback((val: string | undefined) => {
    const newVal = val ?? '';
    setValue(newVal);
    const location = currentFileLocationRef.current;
    if (!location || newVal === lastSavedValueRef.current) return;
    // Flip the status immediately so the user sees "Saving…" the moment they
    // start editing; kick off the actual PUT after a short coalescing window
    // so a burst of keystrokes becomes one request.
    setSaveStatus('saving');
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      saveFile(location, newVal);
    }, 250);
  }, [saveFile]);

  // Toggle the `- [ ]` / `- [x]` at a given source line in the markdown text
  // and push the result through onChange so autosave handles persistence.
  const handleMarkdownCheckboxToggle = useCallback((line: number, nextChecked: boolean) => {
    const lines = value.split('\n');
    const idx = line - 1;
    if (idx < 0 || idx >= lines.length) return;
    const target = nextChecked ? 'x' : ' ';
    const replaced = lines[idx].replace(/\[([ xX])\]/, `[${target}]`);
    if (replaced === lines[idx]) return;
    lines[idx] = replaced;
    onChange(lines.join('\n'));
  }, [value, onChange]);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const userData = useContext(UserDataContext);
  const studentView = userData.studentView;

  // Clear test output when navigating away from student view
  useEffect(() => {
    setTestOutput(null);
    setTestResult(null);
  }, [studentView?.classroomId, studentView?.studentEmail, studentView?.templateName]);

  const runStudentTests = useCallback(async () => {
    if (!studentView) return;
    setTestRunning(true);
    setTestOutput(null);
    setTestResult(null);
    try {
      const res = await fetch(
        `${apiUrl}/classrooms/${studentView.classroomId}/run-student-tests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            student_email: studentView.studentEmail,
            template_name: studentView.templateName,
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        setTestOutput(data.output || 'No output.');
        setTestResult({ passed: data.passed, total: data.total });
      } else {
        setTestOutput('Failed to run tests.');
      }
    } catch {
      setTestOutput('Failed to run tests.');
    } finally {
      setTestRunning(false);
    }
  }, [studentView]);

  // Keep a stable ref to the current file location for use inside callbacks
  useEffect(() => {
    currentFileLocationRef.current = userData.currentFile?.location;
  }, [userData.currentFile?.location]);

  // Cancel pending autosave when switching files
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [userData.currentFile?.location]);

  // BroadcastChannel: reload editor when another tab saves the current file
  useEffect(() => {
    const bc = new BroadcastChannel('3compute-files');
    broadcastChannelRef.current = bc;
    bc.onmessage = (e) => {
      if (
        e.data?.type === 'file-saved' &&
        e.data.location === currentFileLocationRef.current &&
        !autosaveTimerRef.current
      ) {
        userData.setContentVersion?.((v) => (v ?? 0) + 1);
      }
    };
    return () => {
      bc.close();
      broadcastChannelRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the active tab visible in the horizontal tab strip. Only scrolls
  // when the tab is partially or fully clipped, so it doesn't fight a click
  // on an already-visible tab. Re-runs when the right-side actions strip
  // changes width (markdown print/preview, lang picker, run button toggling)
  // because that resizes the tab strip's available room — needed for the
  // .txt → .md case where buttons appear after the file content settles.
  useEffect(() => {
    const container = tabBarRef.current;
    const location = userData.currentFile?.location;
    if (!container || !location) return;
    const tab = container.querySelector<HTMLElement>(
      `[data-tab-location="${CSS.escape(location)}"]`,
    );
    if (!tab) return;
    const cRect = container.getBoundingClientRect();
    const tRect = tab.getBoundingClientRect();
    if (tRect.left < cRect.left) {
      container.scrollBy({ left: tRect.left - cRect.left, behavior: 'smooth' });
    } else if (tRect.right > cRect.right) {
      container.scrollBy({ left: tRect.right - cRect.right, behavior: 'smooth' });
    }
  }, [
    userData.currentFile?.location,
    userData.openFiles.length,
    currentLanguage,
    isImage,
    isBinary,
    isTooLarge,
    loadError,
    mdPreview,
  ]);

  // Close language menu on outside click / escape
  useEffect(() => {
    if (!langMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLangMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [langMenuOpen]);

  const [initialFileSet, setInitialFileSet] = useState(false);

  useEffect(() => {
    if (initialFileSet) return;
    if (userData.currentFile) {
      setInitialFileSet(true);
      return;
    }
    if (userData.files && userData.files.length > 0) {
      const defaultFile = findDefaultFile(userData.files);
      if (defaultFile) {
        userData.setCurrentFile(defaultFile);
        setInitialFileSet(true);
        return;
      }
    }
    if (userData.files !== undefined) {
      setCurrentLanguage('markdown');
      fetch('/README.md')
        .then(response => response.text())
        .then(text => {
          setValue(text);
          setMdPreview(true);
        })
        .catch(err => console.error('Error loading README.md:', err));
      setInitialFileSet(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.currentFile, userData.files, initialFileSet]);

  useEffect(() => {
    const controller = new AbortController();
    const currentFile = userData.currentFile;
    const currentLocation = currentFile?.location;
    const contentVersion = userData.contentVersion;
    (async () => {
      if (!currentFile) return;

      setLoadError(null);
      setIsBinary(false);
      setIsTooLarge(false);

      const isImageFileType = isImageFile(currentFile.name);
      setIsImage(isImageFileType);
      if (isImageFileType) return;

      if (isBinaryFile(currentFile.name)) {
        setIsBinary(true);
        setValue('');
        return;
      }

      const fileres = await fetch(`${apiUrl}/files/file${currentFile.location}?t=${contentVersion ?? 0}`, {
        credentials: 'include',
        signal: controller.signal,
      });

      if (!fileres.ok) {
        console.error('Failed to load file:', currentFile.location);
        setLoadError(`Could not load ${currentFile.location} (${fileres.status})`);
        setValue('');
        return;
      }

      const file = await fileres.text();
      if (currentLocation !== userData.currentFile?.location) return;

      // Detect binary content by null bytes
      if (file.includes('\0')) {
        setIsBinary(true);
        setValue('');
        return;
      }

      // Cap on both line count and total size so Monaco stays responsive.
      // Huge files (generated output, datasets) would otherwise jank the tab
      // and can crash the browser on low-memory devices. A char cap also
      // guards against a single massive-line file that would evade the line
      // check.
      const lineCount = (file.match(/\n/g)?.length ?? 0) + 1;
      if (lineCount > MAX_EDITOR_LINES || file.length > MAX_EDITOR_CHARS) {
        setIsTooLarge(true);
        setValue('');
        return;
      }

      setLoadError(null);
      lastSavedValueRef.current = file;
      setValue(file);
      setSaveStatus('idle');

      const ext = currentFile.name.split('.').pop()?.toLowerCase();
      if (!ext) return;

      const lang = Object.keys(languageMap).find(l => languageMap[l as keyof typeof languageMap].extensions.includes(ext)) as keyof typeof languageMap | undefined || 'text';
      setCurrentLanguage(lang);
    })();
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.currentFile?.location, userData.contentVersion]);

  const monacoLanguage = languageMap[currentLanguage as keyof typeof languageMap]?.language || 'plaintext';
  const currentFile = userData.currentFile;
  const currentLanguageInfo = languageMap[currentLanguage as keyof typeof languageMap];
  const runCommandFn = runCommandMap[currentLanguage as keyof typeof languageMap];
  const canRun = !!(currentFile?.location && runCommandFn && !isImage && !isBinary && !isTooLarge && !loadError);

  return (
    <div className="relative flex flex-col h-full bg-ide-bg border border-ide-rule rounded-lg overflow-hidden w-full">
      {!currentFile && (
        <div className="flex-1 flex items-center justify-center text-ink-muted body">Click a file to view it</div>
      )}

      {currentFile && (
        <div className="flex items-stretch bg-ide-elevated border-b border-ide-rule shrink-0 min-h-10">
          {/* Tabs (scroll horizontally when they would collide with the actions) */}
          <div ref={tabBarRef} className="flex flex-1 min-w-0 overflow-x-auto">
            {userData.openFiles.map((tab) => {
              const isActive = tab.location === currentFile.location;
              const tabExt = tab.name.split('.').pop()?.toLowerCase() || '';
              const tabLang = Object.values(languageMap).find((l) => l.extensions.includes(tabExt));
              const TabIcon = tabLang?.icon ?? FileText;
              const closeTab = () => {
                const idx = userData.openFiles.findIndex((f) => f.location === tab.location);
                const remaining = userData.openFiles.filter((f) => f.location !== tab.location);
                userData.setOpenFiles(remaining);
                if (isActive) {
                  const next = remaining[idx - 1] ?? remaining[idx] ?? undefined;
                  userData.setCurrentFile(next);
                  userData.setSelectedLocation?.(next?.location);
                }
              };
              return (
                <div
                  key={tab.location}
                  data-tab-location={tab.location}
                  className={cn(
                    'group/tab inline-flex items-center gap-2 pl-3.5 pr-1.5 py-1.5 border-r border-ide-rule cursor-pointer font-mono text-[13px] transition-colors shrink-0',
                    isActive
                      ? 'bg-ide-bg border-b-2 border-ochre text-ink-strong'
                      : 'border-b-2 border-transparent text-ink-muted hover:bg-ide-bg/50 hover:text-ink-strong',
                  )}
                  title={`~${tab.location}`}
                  onClick={() => {
                    if (isActive) return;
                    userData.setCurrentFile(tab);
                    userData.setSelectedLocation?.(tab.location);
                  }}
                  onMouseDown={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      closeTab();
                    }
                  }}
                >
                  <TabIcon size={12} className="shrink-0" />
                  <span className="truncate max-w-[200px]">{tab.name}</span>
                  <button
                    type="button"
                    aria-label={`Close ${tab.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab();
                    }}
                    className="ml-1 p-0.5 rounded-sm text-ink-subtle hover:bg-paper-tinted hover:text-ink-strong transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0 px-2 border-l border-ide-rule">
            {!isImage && (
              <span
                className={cn(
                  'text-[11.5px] px-1 select-none whitespace-nowrap font-mono',
                  saveStatus === 'error' ? 'text-tomato' : 'text-ink-subtle',
                )}
                aria-live="polite"
              >
                {saveStatus === 'saving' && 'Saving…'}
                {saveStatus === 'saved' && 'Saved'}
                {saveStatus === 'error' && 'Save failed'}
              </span>
            )}

            {currentLanguage === 'markdown' && !isImage && (
              <>
                {mdPreview && (
                  <button
                    title="Print"
                    aria-label="Print"
                    className="inline-flex items-center justify-center p-1.5 rounded-sm transition-colors cursor-pointer shrink-0 text-ink-muted hover:text-ink-strong hover:bg-paper-tinted"
                    onClick={() => {
                      if (markdownRef.current)
                        printMarkdownElement(markdownRef.current, currentFile.name ?? 'Document');
                    }}
                  >
                    <Printer size={14} />
                  </button>
                )}
                <button
                  title={mdPreview ? 'Show source' : 'Show preview'}
                  aria-label={mdPreview ? 'Show source' : 'Show preview'}
                  className={cn(
                    'inline-flex items-center justify-center p-1.5 rounded-sm transition-colors cursor-pointer shrink-0',
                    mdPreview
                      ? 'text-navy bg-navy-soft hover:brightness-105'
                      : 'text-ink-muted hover:text-ink-strong hover:bg-paper-tinted',
                  )}
                  onClick={() => setMdPreview(!mdPreview)}
                >
                  <Eye size={14} />
                </button>
              </>
            )}

            {!isImage && (
              <div ref={langMenuRef} className="relative">
                <button
                  onClick={() => setLangMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono text-ink-muted hover:bg-paper-tinted hover:text-ink-strong transition-colors cursor-pointer"
                >
                  {currentLanguageInfo?.icon && <currentLanguageInfo.icon size={14} />}
                  <span>{currentLanguageInfo?.name ?? currentLanguage}</span>
                  <ChevronDown size={14} />
                </button>
                {langMenuOpen && (
                  <ul className="absolute right-0 top-full mt-1 max-h-[260px] overflow-y-auto bg-paper-elevated border border-rule-soft rounded-md shadow-md py-1 min-w-[180px] z-50">
                    {Object.entries(languageMap).map(([key, lang]) => {
                      const isActive = key === currentLanguage;
                      const Icon = lang.icon;
                      return (
                        <li
                          key={key}
                          onClick={() => {
                            setCurrentLanguage(key as keyof typeof languageMap);
                            setLangMenuOpen(false);
                          }}
                          className={cn(
                            'flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer font-mono',
                            isActive
                              ? 'text-ink-strong bg-paper-tinted'
                              : 'text-ink-default hover:bg-paper-tinted hover:text-ink-strong',
                          )}
                        >
                          {isActive ? (
                            <Check size={12} className="text-navy shrink-0" />
                          ) : (
                            <span className="w-3 shrink-0" />
                          )}
                          <Icon size={14} className="shrink-0" />
                          <span>{lang.name}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {canRun && (
              <PrimaryButton
                color="forest"
                icon={<Play size={14} />}
                onClick={() => {
                  if (!runCommandFn || !currentFile.location) return;
                  const command = runCommandFn(currentFile.location);
                  window.dispatchEvent(new CustomEvent('3compute:run-command', { detail: { command } }));
                }}
                className="px-3! py-1.5! text-xs! gap-1.5!"
              >
                Run
              </PrimaryButton>
            )}
          </div>
        </div>
      )}

      {studentView && (
        <div className="flex items-center gap-2 bg-tomato-soft border-b border-tomato/30 px-4 py-2 text-tomato shrink-0">
          <span className="text-[13px] flex-1 truncate">
            Viewing <span className="font-semibold">{studentView.studentEmail}</span>
            {' — '}
            <span>{studentView.templateName}</span>
          </span>
          {testOutput !== null ? (
            <button
              className="inline-flex items-center gap-1.5 text-tomato hover:bg-tomato/10 rounded-sm p-1 px-2 text-[13px] transition-colors cursor-pointer"
              onClick={() => {
                setTestOutput(null);
                setTestResult(null);
              }}
            >
              <ArrowLeft size={14} />
              Back to file
            </button>
          ) : testRunning ? (
            <PrimaryButton
              color="plum"
              icon={<RefreshCw size={14} className="animate-spin" />}
              disabled
              className="px-3! py-1.5! text-[12px]!"
            >
              Running…
            </PrimaryButton>
          ) : (
            <PrimaryButton
              color="plum"
              icon={<FlaskConical size={14} />}
              onClick={runStudentTests}
              className="px-3! py-1.5! text-[12px]!"
            >
              Tests
            </PrimaryButton>
          )}
        </div>
      )}

      {/* Body */}
      {!currentFile ? null : testOutput !== null ? (
        <div className="flex-1 overflow-auto p-6 bg-paper-elevated">
          {testResult && (
            <div
              className={cn(
                'mb-3 text-sm font-sans',
                testResult.total > 0 && testResult.passed === testResult.total
                  ? 'text-forest font-semibold'
                  : 'text-ink-muted',
              )}
            >
              Result: {testResult.passed}/{testResult.total} tests passed
            </div>
          )}
          <pre className="whitespace-pre-wrap text-ink-default text-xs leading-relaxed font-mono bg-ide-bg border border-ide-rule rounded-md p-4">
            {testOutput}
          </pre>
        </div>
      ) : isBinary ? (
        <div className="flex-1 flex items-center justify-center p-8 bg-paper">
          <div className="text-center text-ink-muted">
            <File size={48} className="mx-auto mb-3 opacity-40" />
            <p className="body">This file cannot be displayed in the editor.</p>
          </div>
        </div>
      ) : isTooLarge ? (
        <div className="flex-1 flex items-center justify-center p-8 bg-paper">
          <div className="text-center text-ink-muted max-w-sm">
            <File size={48} className="mx-auto mb-3 opacity-40" />
            <p className="body">
              This file is too large to open in the editor ({MAX_EDITOR_LINES.toLocaleString()}-line /{' '}
              {MAX_EDITOR_CHARS.toLocaleString()}-character limit).
            </p>
            <p className="body-sm mt-2">
              View it from the terminal (e.g.{' '}
              <code className="bg-paper-tinted text-navy px-1.5 py-0.5 rounded-sm font-mono text-[12px]">less</code>) or use the
              Download button.
            </p>
            <a
              href={`${apiUrl}/files/download${currentFile?.location}`}
              className="mt-4 inline-block text-navy hover:text-navy/80 font-semibold text-sm underline-offset-2 hover:underline"
            >
              Download
            </a>
          </div>
        </div>
      ) : loadError ? (
        <div className="flex-1 flex items-center justify-center p-8 bg-paper">
          <div className="text-center text-ink-muted">
            <File size={48} className="mx-auto mb-3 opacity-40" />
            <p className="body">{loadError}</p>
            <button
              className="mt-4 inline-flex items-center gap-1.5 text-navy hover:text-navy/80 font-semibold text-sm cursor-pointer"
              onClick={() => userData.setContentVersion?.((v) => (v ?? 0) + 1)}
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        </div>
      ) : isImage ? (
        <div className="flex-1 flex items-center justify-center p-8 bg-paper overflow-auto">
          <div className="bg-paper-elevated border border-rule-soft rounded-md p-4 shadow-sm max-w-full max-h-full inline-flex flex-col items-center">
            <img
              src={`${apiUrl}/files/file${currentFile?.location}`}
              alt={currentFile?.name}
              className="max-w-full max-h-full object-contain"
              style={{ imageRendering: 'auto' }}
            />
            <div className="body-sm text-ink-muted mt-3 text-center">{currentFile?.name}</div>
          </div>
        </div>
      ) : mdPreview && currentLanguage === 'markdown' ? (
        <div className="flex-1 overflow-auto p-6 bg-ide-bg">
          <div className="markdown-content" ref={markdownRef}>
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Task-list items render as `<li class="task-list-item">` with
                // a `<input type="checkbox" disabled>` first child. react-markdown
                // passes the disabled attribute through, and disabled inputs
                // in Chromium don't dispatch click events — so our input
                // override never fires. Override the list item instead and
                // swap the disabled input for a live button styled like a
                // checkbox. The list item also carries reliable source
                // position info for locating the right `[ ]` in the text.
                li: ({ node, children, ...props }) => {
                  const hast = node as
                    | { properties?: { className?: string[] }; position?: { start?: { line?: number } } }
                    | undefined;
                  const classNames = hast?.properties?.className ?? [];
                  const isTaskItem = Array.isArray(classNames) && classNames.includes('task-list-item');
                  if (!isTaskItem) return <li {...props}>{children}</li>;
                  const line = hast?.position?.start?.line;
                  const childArray = Array.isArray(children) ? children : [children];
                  let checked = false;
                  let inputIndex = -1;
                  for (let i = 0; i < childArray.length; i++) {
                    const c = childArray[i] as React.ReactElement<{ type?: string; checked?: boolean }> | undefined;
                    if (c && typeof c === 'object' && 'props' in c && c.props?.type === 'checkbox') {
                      checked = !!c.props.checked;
                      inputIndex = i;
                      break;
                    }
                  }
                  const rest = inputIndex >= 0 ? childArray.filter((_, i) => i !== inputIndex) : childArray;
                  return (
                    <li {...props}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        className="mr-1.5 align-middle cursor-pointer inline-flex items-center justify-center w-4 h-4 rounded-sm border border-rule text-ink-strong bg-paper-elevated hover:border-ink-strong transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (typeof line !== 'number') return;
                          handleMarkdownCheckboxToggle(line, !checked);
                        }}
                      >
                        {checked ? <Check size={12} /> : ''}
                      </button>
                      {rest}
                    </li>
                  );
                },
              }}
            >
              {value}
            </Markdown>
          </div>
        </div>
      ) : isClient ? (
        <div className="flex-1 overflow-hidden bg-ide-bg">
          <MonacoEditor
            height="100%"
            language={monacoLanguage}
            value={value}
            onChange={onChange}
            onMount={handleEditorMount}
            beforeMount={setupDaylightTheme}
            theme={DAYLIGHT_THEME}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              renderWhitespace: 'selection',
              bracketPairColorization: { enabled: true },
              padding: { top: 8 },
            }}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-ide-bg">
          <RefreshCw size={20} className="animate-spin text-ink-muted" />
        </div>
      )}

    </div>
  );
}
