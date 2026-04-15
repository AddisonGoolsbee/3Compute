import { ChangeEvent, useCallback, useContext, useEffect, useRef, useState } from 'react';
import MonacoEditor, { type OnMount } from '@monaco-editor/react';
import { File, Play, Printer, FlaskConical, RefreshCw, ArrowLeft } from 'lucide-react';
import { printMarkdownElement } from '../util/printMarkdown';
import { apiUrl, UserDataContext } from '../util/UserData';
import { getClasses, SelectMenuRaw } from '@luminescent/ui-react';
import { languageMap } from '../util/languageMap';
import { SiMarkdown } from '@icons-pack/react-simple-icons';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Files, FileType } from '../util/Files';

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
  const editorRef = useRef<any>(null);
  const markdownRef = useRef<HTMLDivElement>(null);
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

  return (
    <div className="relative transition-all flex flex-col rounded-lum h-full bg-[#1e1e1e] w-full border border-lum-border/20 overflow-hidden">
      {!userData.currentFile && (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          Click a file to view it
        </div>
      )}
      {userData.currentFile && (
        <div className="flex items-center gap-2 pl-3 p-1 m-1 lum-bg-gray-900 rounded-lum-1 min-w-0">
          <span className="text-sm flex gap-2 items-center flex-1 min-w-0" title={userData?.currentFile?.location}>
            <File size={16} className="shrink-0" />
            <span className="truncate min-w-0">{userData?.currentFile?.location}</span>
            {currentLanguage === 'markdown' && !isImage && (
              <>
                <button className={getClasses({
                  'lum-btn p-1 rounded-lum-2 gap-1 lum-bg-transparent hover:lum-bg-gray-800 shrink-0': true,
                  'text-blue-500': mdPreview,
                })}
                onClick={() => setMdPreview(!mdPreview)}
                >
                  <SiMarkdown size={16} />
                </button>
                {mdPreview && (
                  <button
                    className="lum-btn p-1 rounded-lum-2 lum-bg-transparent hover:lum-bg-gray-800 text-gray-400 hover:text-white shrink-0"
                    title="Print"
                    onClick={() => { if (markdownRef.current) printMarkdownElement(markdownRef.current, userData.currentFile?.name ?? 'Document'); }}
                  >
                    <Printer size={16} />
                  </button>
                )}
              </>
            )}
          </span>
          <div className="flex items-center gap-1">
            {!isImage && (
              <>
                <span
                  className={getClasses({
                    // Fixed-width slot so the leading "Sav" overlaps regardless
                    // of whether we're showing Saving…/Saved/Save failed —
                    // the text stays left-aligned instead of jumping as the
                    // label length changes.
                    'text-xs px-2 select-none whitespace-nowrap inline-block text-left w-20': true,
                    'text-gray-500': saveStatus === 'saving' || saveStatus === 'saved' || saveStatus === 'idle',
                    'text-red-400': saveStatus === 'error',
                  })}
                  aria-live="polite"
                >
                  {saveStatus === 'saving' && 'Saving…'}
                  {saveStatus === 'saved' && 'Saved'}
                  {saveStatus === 'error' && 'Save failed'}
                </span>
                <SelectMenuRaw
                  id="language-select"
                  className="rounded-lum-2 text-xs gap-1 lum-bg-orange-700 hover:lum-bg-orange-600 lum-btn-p-1 shrink-0"
                  value={currentLanguage}
                  values={Object.values(languageMap).map((Lang) => ({
                    name: <div className="flex items-center gap-2">
                      <Lang.icon size={16} />
                      <span className="font-mono">
                        {Lang.name}
                      </span>
                    </div>,
                    value: Lang.name.toLowerCase(),
                  }))}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                    const languageName = e.target.value as keyof typeof languageMap;
                    setCurrentLanguage(languageName);
                  }}
                  customDropdown
                  dropdown={
                    <div className="flex items-center gap-2">
                      {(() => {
                        const LanguageIcon = languageMap[currentLanguage as keyof typeof languageMap]?.icon;
                        return <LanguageIcon size={16} />;
                      })()}
                      <span className="font-mono">
                        {languageMap[currentLanguage as keyof typeof languageMap]?.name}
                      </span>
                    </div>
                  }
                />
                {userData.currentFile?.location && runCommandMap[currentLanguage as keyof typeof languageMap] && (
                  <button
                    className="lum-btn rounded-lum-2 text-xs gap-1 lum-btn-p-1 lum-bg-blue-700 hover:lum-bg-blue-600 shrink-0"
                    onClick={() => {
                      const buildCmd = runCommandMap[currentLanguage as keyof typeof languageMap];
                      if (!buildCmd || !userData.currentFile?.location) return;
                      const command = buildCmd(userData.currentFile.location);
                      window.dispatchEvent(new CustomEvent('3compute:run-command', { detail: { command } }));
                    }}
                  >
                    <Play size={16} />
                    Run
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {studentView && (
        <div className="flex items-center gap-2 px-3 py-1.5 mx-1 mb-1 rounded-lum-1 bg-blue-950/40 border border-blue-800/30">
          <span className="text-xs text-blue-300 flex-1 truncate">
            Viewing <span className="font-medium">{studentView.studentEmail}</span>
            {' \u2014 '}
            <span className="text-blue-400">{studentView.templateName}</span>
          </span>
          {testOutput !== null ? (
            <button
              className="flex items-center gap-1 text-xs text-blue-300 hover:text-white transition-colors"
              onClick={() => { setTestOutput(null); setTestResult(null); }}
            >
              <ArrowLeft size={12} />
              Back to file
            </button>
          ) : (
            <button
              className="flex items-center gap-1 text-xs text-blue-300 hover:text-white transition-colors"
              onClick={runStudentTests}
              disabled={testRunning}
            >
              {testRunning ? <RefreshCw size={12} className="animate-spin" /> : <FlaskConical size={12} />}
              {testRunning ? 'Running...' : 'Run Tests'}
            </button>
          )}
        </div>
      )}
      {!userData.currentFile ? null : testOutput !== null ? (
        <div className="flex-1 overflow-auto p-4 font-mono text-sm">
          {testResult && (
            <div className={`mb-3 text-sm font-sans ${testResult.total > 0 && testResult.passed === testResult.total ? 'text-green-400' : 'text-gray-400'}`}>
              Result: {testResult.passed}/{testResult.total} tests passed
            </div>
          )}
          <pre className="whitespace-pre-wrap text-gray-300 text-xs leading-relaxed">{testOutput}</pre>
        </div>
      ) : isBinary ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-400">
            <File size={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">This file cannot be displayed in the editor.</p>
          </div>
        </div>
      ) : isTooLarge ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-400 max-w-sm">
            <File size={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              This file is too large to open in the editor
              ({MAX_EDITOR_LINES.toLocaleString()}-line / {MAX_EDITOR_CHARS.toLocaleString()}-character limit).
            </p>
            <p className="text-xs text-gray-500 mt-2">
              View it from the terminal (e.g. <code className="bg-gray-800 px-1 rounded">less</code>) or use the Download button.
            </p>
            <a
              href={`${apiUrl}/files/download${userData.currentFile?.location}`}
              className="mt-3 inline-block text-xs lum-btn lum-bg-gray-800 hover:lum-bg-gray-700 rounded-lum-2 lum-btn-p-1"
            >
              Download
            </a>
          </div>
        </div>
      ) : loadError ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-400">
            <File size={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">{loadError}</p>
            <button
              className="mt-3 text-xs lum-btn lum-bg-gray-800 hover:lum-bg-gray-700 rounded-lum-2 lum-btn-p-1"
              onClick={() => userData.setContentVersion?.((v) => (v ?? 0) + 1)}
            >
              Retry
            </button>
          </div>
        </div>
      ) : isImage ? (
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          <img
            src={`${apiUrl}/files/file${userData.currentFile?.location}`}
            alt={userData.currentFile?.name}
            className="max-w-full max-h-full object-contain"
            style={{ imageRendering: 'auto' }}
          />
        </div>
      ) : mdPreview && currentLanguage === 'markdown' ? (
        <div className="flex-1 overflow-auto p-4">
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
                  const hast = node as { properties?: { className?: string[] }; position?: { start?: { line?: number } } } | undefined;
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
                  const rest = inputIndex >= 0
                    ? childArray.filter((_, i) => i !== inputIndex)
                    : childArray;
                  return (
                    <li {...props}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        className="mr-1.5 align-middle cursor-pointer inline-flex items-center justify-center w-4 h-4 rounded border border-gray-500 text-gray-200 bg-gray-900 hover:border-gray-300"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (typeof line !== 'number') return;
                          handleMarkdownCheckboxToggle(line, !checked);
                        }}
                      >
                        {checked ? '✓' : ''}
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
        <MonacoEditor
          height="100%"
          language={monacoLanguage}
          value={value}
          onChange={onChange}
          onMount={handleEditorMount}
          theme="vs-dark"
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
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="lum-loading w-6 h-6 border-2" />
        </div>
      )}
    </div>
  );
}
