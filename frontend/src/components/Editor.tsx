import { ChangeEvent, useCallback, useContext, useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { File, Save, Check, X } from 'lucide-react';
import { backendUrl, UserDataContext } from '../util/UserData';
import { getClasses, SelectMenuRaw } from '@luminescent/ui-react';
import { languageMap } from '../util/languageMap';
import { SiMarkdown } from '@icons-pack/react-simple-icons';
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night';
import { color } from '@uiw/codemirror-extensions-color';
import { hyperLink } from '@uiw/codemirror-extensions-hyper-link';
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import Markdown from 'react-markdown';
import { Files, FileType } from '../util/Files';

function findDefaultFile(files: Files): FileType | undefined {
  console.log('Finding default file in:', files);

  const defaultFileNames = ['readme', 'index.'];
  for (const fileName of defaultFileNames) {
    for (const item of files) {
      if (!('files' in item) && item.name.toLowerCase().startsWith(fileName.toLowerCase())) {
        console.log('Found default file:', item);
        return item;
      }
    }
  }

  for (const item of files) {
    if ('files' in item && item.files) {
      const foundFile = findDefaultFile(item.files);
      if (foundFile) return foundFile;
    }
  }

  return undefined;
}

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
  const onChange = useCallback((val: string) => {
    setValue(val);
  }, []);
  const userData = useContext(UserDataContext);

  useEffect(() => {
    if (userData.currentFile) return;
    // Find a default file to open
    let currentFile: FileType | undefined;
    // console.log(userData.files);f
    if (userData.files && userData.files.length > 0) {
      currentFile = findDefaultFile(userData.files);
    }
    if (currentFile) {
      userData.setCurrentFile(currentFile);
    }
    else {
      setCurrentLanguage('markdown');
      fetch('/README.md')
        .then(response => response.text())
        .then(text => {
          setValue(text);
          setMdPreview(true);
        })
        .catch(err => console.error('Error loading README.md:', err));
    }
  }, [userData]);

  useEffect(() => {
    const controller = new AbortController();
    const currentLocation = userData.currentFile?.location;
    (async () => {
      if (!userData.currentFile) return;

      // Check if the current file is an image
      const isImageFileType = isImageFile(userData.currentFile.name);
      setIsImage(isImageFileType);
      if (isImageFileType) return;

      // Load the file content
      const fileres = await fetch(`${backendUrl}/file${userData.currentFile.location}?t=${userData.contentVersion ?? 0}`, {
        credentials: 'include',
        signal: controller.signal,
      });
      if (!fileres.ok) {
        console.error('Failed to load file:', userData.currentFile.location);
        userData.setCurrentFile(undefined);
        return;
      }
      const file = await fileres.text();
      if (currentLocation !== userData.currentFile?.location) return; // stale response
      setValue(file);

      // Set the language based on the file extension
      const ext = userData.currentFile.name.split('.').pop()?.toLowerCase();
      if (!ext) return;

      const lang = Object.keys(languageMap).find(l => languageMap[l as keyof typeof languageMap].extensions.includes(ext)) as keyof typeof languageMap | undefined || 'text';
      setCurrentLanguage(lang);
    })();
    return () => controller.abort();
  }, [userData.currentFile?.location, userData.contentVersion]);

  return (
    <div className="relative transition-all flex flex-col rounded-lum max-w-3/4 bg-[#1A1B26] w-full border border-lum-border/20">
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
                      const response = await fetch(`${backendUrl}/file${userData.currentFile.location}`, {
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
                        console.log('File saved successfully');
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
              </>
            )}
          </div>
        </div>
      )}
      {isImage ? (
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          <img
            src={`${backendUrl}/file${userData.currentFile?.location}`}
            alt={userData.currentFile?.name}
            className="max-w-full max-h-full object-contain"
            style={{ imageRendering: 'auto' }}
          />
        </div>
      ) : mdPreview && currentLanguage === 'markdown' ? (
        <div className="flex-1 overflow-auto p-4">
          <div className="markdown-content">
            <Markdown>
              {value}
            </Markdown>
          </div>
        </div>
      ) : (
        <div className="overflow-auto">
          <CodeMirror value={value} theme={tokyoNight} onChange={onChange} className="w-full h-full" extensions={[
            languageMap[currentLanguage as keyof typeof languageMap].parser(),
            color, hyperLink, indentationMarkers({  }),
          ]} />
        </div>
      )}
    </div>
  );
}