import { useEffect, useState, useContext, useRef } from 'react';
import { LayoutTemplate, Loader2 } from 'lucide-react';
import { apiUrl, UserDataContext } from '../../util/UserData';
import { StatusContext } from '../../util/Files';
import { cn } from '../../util/cn';

type Manifest = Record<string, string[]>;

export default function TemplateButton() {
  const [manifest, setManifest] = useState<Manifest>({});
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setStatus } = useContext(StatusContext);
  const userData = useContext(UserDataContext);

  useEffect(() => {
    fetch('/templateProjects/manifest.json')
      .then((res) => res.json())
      .then((data: Manifest) => setManifest(data))
      .catch((err) => console.error('Failed to load template manifest', err));
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  const getUniqueFolderName = (baseName: string): string => {
    const existing = userData?.files;
    if (!existing) return baseName;
    const topLevelNames = new Set(existing.map((item) => item.name));
    if (!topLevelNames.has(baseName)) return baseName;
    let n = 1;
    while (topLevelNames.has(`${baseName} (${n})`)) n++;
    return `${baseName} (${n})`;
  };

  const handleUseTemplate = async (templateName: string) => {
    if (!templateName) return;
    setOpen(false);
    setStatus('Uploading template…');

    const folderName = getUniqueFolderName(templateName);
    const files = manifest[templateName] || [];
    const formData = new FormData();

    try {
      await Promise.all(
        files.map(async (filename) => {
          const url = `${window.location.origin}/templateProjects/${templateName}/${filename}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch ${url}`);
          const blob = await res.blob();
          let text = await blob.text();

          if (templateName === 'Website' && filename === 'main.py' && userData?.userInfo) {
            text = text.replace(/8000/g, userData.userInfo.port_start.toString());
            text = text.replace(/host\s*=\s*['"][^'"]+['"]/, 'host = "0.0.0.0"');
          }

          formData.append('files', new Blob([text], { type: blob.type }), `${folderName}/${filename}`);
        }),
      );

      formData.append('move-into', folderName);

      const res = await fetch(`${apiUrl}/files/upload-folder`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);

      setStatus('Template uploaded!');
      await userData.refreshFiles();

      const templateFolderLocation = `/${folderName}`;
      const readmeCandidate = files.find((f) => /^(readme)(\.|$)/i.test(f)) || 'README.md';
      userData.setOpenFolders((prev) =>
        prev.includes(templateFolderLocation) ? prev : [...prev, templateFolderLocation],
      );
      userData.setCurrentFile({ name: readmeCandidate, location: `${templateFolderLocation}/${readmeCandidate}` });
    } catch (error) {
      console.error('Template upload error:', error);
      setStatus(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    setTimeout(() => setStatus(null), 1000);
  };

  const templateNames = Object.keys(manifest);
  if (!templateNames.length) {
    return (
      <div className="inline-flex items-center justify-center px-2 py-1.5">
        <Loader2 size={14} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="bg-paper-elevated text-ink-default border border-ide-rule px-2 py-1.5 rounded-sm text-xs font-medium cursor-pointer font-sans inline-flex items-center justify-center gap-1.5 hover:bg-paper-tinted transition-colors w-full"
      >
        <LayoutTemplate size={14} className="text-ink-muted" />
        Templates
      </button>
      <div
        className={cn(
          'absolute left-0 top-full mt-1 bg-paper-elevated border border-rule-soft rounded-md shadow-md py-1 min-w-[200px] z-50 transition-opacity duration-150',
          !open && 'opacity-0 pointer-events-none',
        )}
      >
        {templateNames.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => handleUseTemplate(name)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink-default hover:bg-paper-tinted hover:text-ink-strong cursor-pointer w-full text-left transition-colors"
          >
            {name.replace(/[-_]/g, ' ')}
          </button>
        ))}
      </div>
    </div>
  );
}
