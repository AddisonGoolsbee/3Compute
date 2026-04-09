import { useEffect, useState, useContext, ChangeEvent } from 'react';
import { SelectMenuRaw } from '@luminescent/ui-react';
import { LayoutTemplate } from 'lucide-react';
import { apiUrl, UserDataContext } from '../../util/UserData';
import { StatusContext } from '../../util/Files';

type Manifest = Record<string, string[]>;

export default function TemplateButton() {
  const [manifest, setManifest] = useState<Manifest>({});
  const [selected, setSelected] = useState<string>('');
  const { setStatus } = useContext(StatusContext);
  const userData = useContext(UserDataContext);

  useEffect(() => {
    fetch('/templateProjects/manifest.json')
      .then((res) => res.json())
      .then((data: Manifest) => setManifest(data))
      .catch((err) => console.error('Failed to load template manifest', err));
  }, []);

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
  if (!templateNames.length) return <div className="lum-loading animate-spin w-4 h-4" />;

  return (
    <SelectMenuRaw
      id="template-select"
      className="lum-btn-p-1 rounded-lum-2 gap-1 text-xs lum-bg-blue-950 hover:lum-bg-blue-900 w-full"
      value={selected}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => {
        const name = e.target.value;
        setSelected(name);
        if (name) handleUseTemplate(name);
      }}
      values={templateNames.map((name) => ({ name: name.replace(/[-_]/g, ' '), value: name }))}
      customDropdown
      dropdown={
        <div className="flex items-center gap-1">
          <LayoutTemplate size={16} />
          Templates
        </div>
      }
    />
  );
}
