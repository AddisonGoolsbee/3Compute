import { useEffect, useState, useContext, ChangeEvent } from 'react';
import { SelectMenuRaw } from '@luminescent/ui-react';
import { LayoutTemplate } from 'lucide-react';
import { backendUrl, UserDataContext } from '../../util/UserData';
import { StatusContext } from '../../util/Files';

type Manifest = Record<string, string[]>;

export default function TemplateButton() {
  const [manifest, setManifest] = useState<Manifest>({});
  const [selected, setSelected] = useState<string>('');
  const { setStatus } = useContext(StatusContext);
  const userData = useContext(UserDataContext);

  // 1) load the manifest once on mount
  useEffect(() => {
    fetch('/templateProjects/manifest.json')
      .then((res) => res.json())
      .then((data: Manifest) => {
        setManifest(data);
      })
      .catch((err) => console.error('Failed to load template manifest', err));
  }, []);

  const handleUseTemplate = async (templateName: string) => {
    if (!templateName) return;
    setStatus('Uploading template…');

    const files = manifest[templateName] || [];
    const formData = new FormData();

    try {
      // 2) fetch each file from public/templates/<selected>/
      await Promise.all(
        files.map(async (filename) => {
          // Use a different path that won't be intercepted by Vite routing
          const baseUrl = window.location.origin;
          const url = `${baseUrl}/templateProjects/${templateName}/${filename}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch ${url}`);
          const blob = await res.blob();
          const text = await blob.text();

          // Simple find and replace for website template
          let modifiedText = text;
          if (templateName === 'Website' && filename === 'main.py' && userData?.userInfo) {
            modifiedText = text.replace(
              /8000/g,
              userData.userInfo.port_start.toString(),
            );
            // Ensure the host remains 0.0.0.0 for local accessibility
            modifiedText = modifiedText.replace(
              /host\s*=\s*['"][^'"]+['"]/,
              'host = "0.0.0.0"',
            );
          }

          // Convert back to blob for FormData
          const fileBlob = new Blob([modifiedText], { type: blob.type });
          // Preserve folder structure by prefixing with template name
          const filePath = `${templateName}/${filename}`;
          formData.append('files', fileBlob, filePath);
        }),
      );

      // Add move-into parameter to change into the template directory
      formData.append('move-into', templateName);

      // 3) POST to your existing endpoint
      const res = await fetch(`${backendUrl}/upload-folder`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errorText}`);
      }

      setStatus('Template uploaded!');
      await userData.refreshFiles();

      // Expand the uploaded template folder and select README in the explorer
      const templateFolderLocation = `/${templateName}`;
      const readmeCandidate = (files.find((f) => /^(readme)(\.|$)/i.test(f)) || 'README.md');
      const readmeLocation = `${templateFolderLocation}/${readmeCandidate}`;

      userData.setOpenFolders((prev) => (
        prev.includes(templateFolderLocation)
          ? prev
          : [...prev, templateFolderLocation]
      ));
      userData.setCurrentFile({
        name: readmeCandidate,
        location: readmeLocation,
      });
    } catch (error) {
      console.error('Template upload error:', error);
      setStatus(
        `Upload failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }

    setTimeout(() => setStatus(null), 1000);
  };

  const templateNames = Object.keys(manifest);

  if (!templateNames.length) {
    return <div className="lum-loading animate-spin w-4 h-4" />;
  }

  return <SelectMenuRaw
    id="template-select"
    className="lum-btn-p-1 rounded-lum-2 gap-1 text-xs lum-bg-blue-950 hover:lum-bg-blue-900 w-full"
    value={selected}
    onChange={(e: ChangeEvent<HTMLSelectElement>) => {
      const templateName = e.target.value;
      setSelected(templateName);
      if (templateName) {
        handleUseTemplate(templateName);
      }
    }}
    values={templateNames.map((name) => ({
      name: name.replace(/[-_]/g, ' '),
      value: name,
    }))}
    customDropdown
    dropdown={
      <div className="flex items-center gap-1">
        <LayoutTemplate size={16} />
        Templates
      </div>
    }
  />;
}
