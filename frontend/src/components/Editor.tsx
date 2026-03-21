import { ChangeEvent, useCallback, useContext, useEffect, useRef, useState } from 'react';
import MonacoEditor, { type OnMount } from '@monaco-editor/react';
import { File, Save, Check, X, Play } from 'lucide-react';
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

function isImageFile(filename: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'];
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? imageExtensions.includes(ext) : false;
}

export default function Editor() {
  const [value, setValue] = useState('');
  const [mdPreview, setMdPreview] = useState<boolean>(true);
  const [currentLanguage, setCurrentLanguage] = useState<keyof typeof languageMap>('javascript');
  const [isImage, setIsImage] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const editorRef = useRef<any>(null);

  useEffect(() => { setIsClient(true); }, []);

  const onChange = useCallback((val: string | undefined) => {
    setValue(val ?? '');
  }, []);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const userData = useContext(UserDataContext);

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

      const isImageFileType = isImageFile(currentFile.name);
      setIsImage(isImageFileType);
      if (isImageFileType) return;

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

      setLoadError(null);
      setValue(file);

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
    <div className="relative transition-all flex flex-col rounded-lum h-full bg-[#1e1e1e] w-full border border-lum-border/20">
      {userData.currentFile && (
        <div className="flex items-center gap-2 pl-3 p-1 m-1 lum-bg-gray-900 rounded-lum-1">
          <span className="text-sm flex gap-2 items-center flex-1">
            <File size={16} />
            {userData?.currentFile?.location}
            {currentLanguage === 'markdown' && !isImage && (
              <button className={getClasses({
                'lum-btn p-1 rounded-lum-2 gap-1 lum-bg-transparent hover:lum-bg-gray-800': true,
                'text-blue-500': mdPreview,
              })}
              onClick={() => setMdPreview(!mdPreview)}
              >
                <SiMarkdown size={16} />
              </button>
            )}
          </span>
          <div className="flex items-center gap-1">
            {!isImage && (
              <>
                <SelectMenuRaw
                  id="language-select"
                  className="rounded-lum-2 text-xs gap-1 lum-bg-orange-700 hover:lum-bg-orange-600 w-full lum-btn-p-1"
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
                <button
                  className={getClasses({
                    'lum-btn rounded-lum-2 text-xs gap-1 w-full lum-btn-p-1': true,
                    'lum-bg-green-700 hover:lum-bg-green-600': saveStatus === 'idle',
                    'lum-bg-blue-700': saveStatus === 'saving',
                    'lum-bg-green-600': saveStatus === 'saved',
                    'lum-bg-red-700': saveStatus === 'error',
                  })}
                  onClick={async () => {
                    if (!userData.currentFile || saveStatus === 'saving') return;

                    setSaveStatus('saving');

                    try {
                      const response = await fetch(`${apiUrl}/files/file${userData.currentFile.location}`, {
                        method: 'PUT',
                        body: value,
                        headers: {
                          'Content-Type': 'text/plain; charset=utf-8',
                        },
                        credentials: 'include',
                      });

                      if (!response.ok) {
                        console.error('Failed to save file');
                        setSaveStatus('error');
                        setTimeout(() => setSaveStatus('idle'), 3000);
                      } else {
                        setSaveStatus('saved');
                        setTimeout(() => setSaveStatus('idle'), 1000);
                      }
                    } catch (error) {
                      console.error('Error saving file:', error);
                      setSaveStatus('error');
                      setTimeout(() => setSaveStatus('idle'), 3000);
                    }
                  }}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' && <Save size={16} className="animate-pulse" />}
                  {saveStatus === 'saved' && <Check size={16} />}
                  {saveStatus === 'error' && <X size={16} />}
                  {saveStatus === 'idle' && <Save size={16} />}
                  {saveStatus === 'saving' && 'Saving...'}
                  {saveStatus === 'saved' && 'Saved!'}
                  {saveStatus === 'error' && 'Error'}
                  {saveStatus === 'idle' && 'Save'}
                </button>
                {userData.currentFile?.location && runCommandMap[currentLanguage as keyof typeof languageMap] && (
                  <button
                    className="lum-btn rounded-lum-2 text-xs gap-1 w-full lum-btn-p-1 lum-bg-blue-700 hover:lum-bg-blue-600"
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
      {loadError ? (
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
          <div className="markdown-content">
            <Markdown remarkPlugins={[remarkGfm]}>
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
