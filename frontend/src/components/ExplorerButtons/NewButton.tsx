import { File, Folder, LayoutTemplate, Plus } from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import { SelectMenuRaw } from '@luminescent/ui-react';
import { apiUrl, UserDataContext } from '../../util/UserData';
import { StatusContext } from '../../util/Files';

type Manifest = Record<string, string[]>;

interface ClassroomTemplate {
  name: string;
  files: string[];
}

interface ClassroomWithTemplates {
  id: string;
  name: string;
  templates: ClassroomTemplate[];
}

export default function NewButton() {
  const userData = useContext(UserDataContext);
  const { setStatus } = useContext(StatusContext);

  const [manifest, setManifest] = useState<Manifest>({});
  const [classroomTemplates, setClassroomTemplates] = useState<ClassroomWithTemplates[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showClassroomPickerDialog, setShowClassroomPickerDialog] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<ClassroomWithTemplates | null>(null);
  const [showClassroomTemplateDialog, setShowClassroomTemplateDialog] = useState(false);

  useEffect(() => {
    fetch('/templateProjects/manifest.json')
      .then((res) => res.json())
      .then((data: Manifest) => setManifest(data))
      .catch((err) => console.error('Failed to load template manifest', err));
  }, []);

  useEffect(() => {
    if (!userData?.userInfo || !userData?.classroomSymlinks) return;

    fetch(`${apiUrl}/classrooms/assignments`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const classroomsWithTemplates = Array.isArray(data.classrooms) ? data.classrooms : [];
        const availableClassrooms = classroomsWithTemplates.filter((classroom: ClassroomWithTemplates) => {
          const slug = Object.keys(userData.classroomSymlinks || {}).find(
            s => userData.classroomSymlinks?.[s]?.id === classroom.id,
          );
          return !!slug;
        });
        setClassroomTemplates(availableClassrooms);
      })
      .catch((err) => console.error('Failed to load classroom assignments', err));
  }, [userData?.userInfo, userData?.classroomSymlinks]);

  const handleFileClick = (overrideBase?: string) => {
    if (!userData.files) return;
    userData.setIsUserEditingName?.(true);
    const base = overrideBase ?? computeBasePath(userData.files, userData.selectedLocation);
    const folderKey = base.endsWith('/') ? base.slice(0, -1) : base;
    if (folderKey && folderKey !== '/') {
      userData.setOpenFolders((prev) => prev.includes(folderKey) ? prev : [...prev, folderKey]);
    }
    const newFile = {
      name: 'new_file',
      location: `${base}new_file`,
      renaming: true,
      placeholder: true,
    } as const;
    // Drop any previously-spawned placeholder (e.g. one left in an error
    // state from a validation failure) before inserting this one, otherwise
    // two inline-rename inputs collide and the tree keys conflict.
    const cleaned = stripPlaceholders(userData.files);
    const next = insertPlaceholder(cleaned, base, newFile);
    userData.setFilesClientSide(next);
  };

  const handleFolderClick = (overrideBase?: string) => {
    if (!userData.files) return;
    userData.setIsUserEditingName?.(true);
    const base = overrideBase ?? computeBasePath(userData.files, userData.selectedLocation);
    const newFolder = {
      name: 'new_folder',
      location: `${base}new_folder/`,
      renaming: true,
      files: [],
      placeholder: true,
    } as const;
    const cleaned = stripPlaceholders(userData.files);
    const next = insertPlaceholder(cleaned, base, newFolder);
    userData.setFilesClientSide(next);
    userData.setOpenFolders((prev) => prev.includes(base.endsWith('/') ? base.slice(0, -1) : base) ? prev : [...prev, base.endsWith('/') ? base.slice(0, -1) : base]);
  };

  function stripPlaceholders(files: any[]): any[] {
    return files
      .filter((f) => !f.placeholder)
      .map((f) => ('files' in f ? { ...f, files: stripPlaceholders(f.files) } : f));
  }

  // Allow the Explorer context menu (MenuItems.tsx) to invoke the same actions
  // via a shared event, passing the right-clicked path as the base.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { kind: 'file' | 'folder' | 'template'; base?: string } | undefined;
      if (!detail) return;
      const base = detail.base ?? '/';
      if (detail.kind === 'file') handleFileClick(base);
      else if (detail.kind === 'folder') handleFolderClick(base);
      else if (detail.kind === 'template') setShowTemplatePicker(true);
    };
    window.addEventListener('3compute:new-at', handler as EventListener);
    return () => window.removeEventListener('3compute:new-at', handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.files, userData.selectedLocation]);

  function insertPlaceholder(files: any[], base: string, item: any): any[] {
    const normBase = base.endsWith('/') ? base.slice(0, -1) : base;
    if (normBase === '' || normBase === '/') {
      return [...files, item];
    }
    return files.map((f) => {
      if ('files' in f) {
        if (f.location === normBase) {
          return { ...f, files: [...f.files, item] };
        }
        return { ...f, files: insertPlaceholder(f.files, base, item) };
      }
      return f;
    });
  }

  function computeBasePath(files: any[] | undefined, selected?: string) {
    if (!selected) return '/';
    const isFolder = !!findFolderByLocation(files, selected);
    if (isFolder) {
      return selected.endsWith('/') ? selected : `${selected}/`;
    }
    const idx = selected.lastIndexOf('/');
    if (idx >= 0) return selected.slice(0, idx + 1) || '/';
    return '/';
  }

  function findFolderByLocation(files: any[] | undefined, loc: string): any | undefined {
    if (!files) return undefined;
    for (const f of files) {
      if ('files' in f) {
        if (f.location === loc || f.location === loc.replace(/\/$/, '')) return f;
        const found = findFolderByLocation(f.files, loc);
        if (found) return found;
      }
    }
    return undefined;
  }

  // --- Template logic ---

  const handleUseTemplate = async (templateName: string) => {
    if (!templateName) return;
    setShowTemplatePicker(false);
    await uploadToPersonalWorkspace(templateName);
  };

  const uploadToPersonalWorkspace = async (templateName: string) => {
    setStatus('Uploading template…');
    const files = manifest[templateName] || [];
    const formData = new FormData();

    try {
      await Promise.all(
        files.map(async (filename) => {
          const baseUrl = window.location.origin;
          const url = `${baseUrl}/templateProjects/${templateName}/${filename}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch ${url}`);
          const blob = await res.blob();
          const text = await blob.text();

          let modifiedText = text;
          if (templateName === 'Website' && filename === 'main.py' && userData?.userInfo) {
            modifiedText = text.replace(
              /8000/g,
              userData.userInfo.port_start.toString(),
            );
            modifiedText = modifiedText.replace(
              /host\s*=\s*['"][^'"]+['"]/,
              'host = "0.0.0.0"',
            );
          }

          const fileBlob = new Blob([modifiedText], { type: blob.type });
          const filePath = `${templateName}/${filename}`;
          formData.append('files', fileBlob, filePath);
        }),
      );

      formData.append('move-into', templateName);

      const res = await fetch(`${apiUrl}/files/upload-folder`, {
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
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    setTimeout(() => setStatus(null), 1000);
  };

  const uploadClassroomTemplate = async (classroomId: string, templateName: string, files: string[]) => {
    setStatus('Copying template from classroom…');

    try {
      const classroomSymlinks = userData.classroomSymlinks || {};
      const classroomSlug = Object.keys(classroomSymlinks).find(
        slug => classroomSymlinks[slug]?.id === classroomId,
      );

      if (!classroomSlug) {
        throw new Error('Classroom folder not mounted. Try refreshing the page or logging out and back in.');
      }

      const formData = new FormData();
      type TemplateBase = 'assignments' | '.templates';
      let resolvedBase: TemplateBase | null = null;

      const fetchFile = async (filename: string): Promise<Blob> => {
        // Teachers see the real `assignments/` dir; students see a `.templates`
        // symlink pointing to it. Try both.
        const baseCandidates: TemplateBase[] = resolvedBase
          ? [resolvedBase]
          : ['assignments', '.templates'];

        for (const base of baseCandidates) {
          const url = `${apiUrl}/files/file/${classroomSlug}/${base}/${templateName}/${filename}`;
          const res = await fetch(url, { credentials: 'include' });
          if (res.ok) {
            if (!resolvedBase) resolvedBase = base;
            return await res.blob();
          }
          if (res.status === 404) continue;
          const errorText = await res.text().catch(() => '');
          throw new Error(`Failed to fetch ${filename}: ${res.status} ${errorText}`);
        }
        throw new Error(`Failed to fetch ${filename}: 404`);
      };

      const fetchedFiles = await Promise.all(
        files.map(async (filename) => {
          const blob = await fetchFile(filename);
          return { filename, blob };
        }),
      );

      for (const { filename, blob } of fetchedFiles) {
        formData.append('files', blob, `${templateName}/${filename}`);
      }

      formData.append('move-into', templateName);

      const res = await fetch(`${apiUrl}/files/upload-folder`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errorText}`);
      }

      setStatus('Template copied to workspace!');
      await userData.refreshFiles();

      const templateFolderLocation = `/${templateName}`;

      userData.setOpenFolders((prev) => {
        return prev.includes(templateFolderLocation) ? prev : [...prev, templateFolderLocation];
      });
    } catch (error) {
      console.error('Classroom template copy error:', error);
      setStatus(
        `Copy failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    setTimeout(() => setStatus(null), 3000);
  };

  const templateNames = Object.keys(manifest);

  return <>
    <SelectMenuRaw
      id="new-button"
      className="lum-btn-p-1 rounded-lum-2 gap-1 text-xs lum-bg-green-950 hover:lum-bg-green-900"
      customDropdown
      dropdown={
        <div className="flex items-center gap-1">
          <Plus size={16} />
          New
        </div>
      }
      extra-buttons={<>
        <button
          onClick={() => handleFileClick()}
          className="lum-btn lum-btn-p-1 rounded-lum-1 gap-1 text-xs lum-bg-transparent"
        >
          <File size={16} />
          File
        </button>
        <button
          onClick={() => handleFolderClick()}
          className="lum-btn lum-btn-p-1 rounded-lum-1 gap-1 text-xs lum-bg-transparent"
        >
          <Folder size={16} />
          Folder
        </button>
        {templateNames.length > 0 && (
          <button
            onClick={() => setShowTemplatePicker(true)}
            className="lum-btn lum-btn-p-1 rounded-lum-1 gap-1 text-xs lum-bg-transparent"
          >
            <LayoutTemplate size={16} />
            Template
          </button>
        )}
      </>}
    />

    {/* Template Picker Dialog */}
    {showTemplatePicker && (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={() => setShowTemplatePicker(false)}
        />
        <div
          className="relative border border-white/10 rounded-lg shadow-xl w-full max-w-md p-6 flex flex-col gap-4"
          style={{ backgroundColor: 'var(--color-bg)' }}
        >
          <h2 className="text-lg font-semibold">Choose a Template</h2>
          <p className="text-sm opacity-70">
            Select a template to add to your workspace:
          </p>

          <div className="flex flex-col gap-2 max-h-96 overflow-auto">
            {classroomTemplates.length > 0 && (
              <button
                onClick={() => {
                  setShowTemplatePicker(false);
                  setShowClassroomPickerDialog(true);
                }}
                className="lum-btn lum-bg-purple-700 hover:lum-bg-purple-600 text-left px-4 py-3 rounded-lum-1"
              >
                <div className="font-medium">Classroom Assignments</div>
                <div className="text-xs opacity-70">
                  Browse assignments from your classrooms
                </div>
              </button>
            )}
            {templateNames.map((name) => (
              <button
                key={name}
                onClick={() => handleUseTemplate(name)}
                className="lum-btn lum-bg-blue-600 hover:lum-bg-blue-500 text-left px-4 py-3 rounded-lum-1"
              >
                <div className="font-medium">{name.replace(/[-_]/g, ' ')}</div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowTemplatePicker(false)}
            className="lum-btn lum-bg-transparent hover:lum-bg-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    )}

    {/* Classroom Picker Dialog */}
    {showClassroomPickerDialog && (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={() => {
            setShowClassroomPickerDialog(false);
          }}
        />
        <div
          className="relative border border-white/10 rounded-lg shadow-xl w-full max-w-md p-6 flex flex-col gap-4"
          style={{ backgroundColor: 'var(--color-bg)' }}
        >
          <h2 className="text-lg font-semibold">Choose a Classroom</h2>
          <p className="text-sm opacity-70">
            Select a classroom to browse its assignments:
          </p>

          <div className="flex flex-col gap-2 max-h-96 overflow-auto">
            {classroomTemplates.map((classroom) => (
              <button
                key={classroom.id}
                onClick={() => {
                  setSelectedClassroom(classroom);
                  setShowClassroomPickerDialog(false);
                  setShowClassroomTemplateDialog(true);
                }}
                className="lum-btn lum-bg-purple-700 hover:lum-bg-purple-600 text-left px-4 py-3 rounded-lum-1"
              >
                <div className="font-medium">{classroom.name}</div>
                <div className="text-xs opacity-70">
                  {classroom.templates.length} assignment{classroom.templates.length !== 1 ? 's' : ''} available
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowClassroomPickerDialog(false)}
            className="lum-btn lum-bg-transparent hover:lum-bg-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    )}

    {/* Classroom Template Picker Dialog */}
    {showClassroomTemplateDialog && selectedClassroom && (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={() => {
            setShowClassroomTemplateDialog(false);
            setSelectedClassroom(null);
          }}
        />
        <div
          className="relative border border-white/10 rounded-lg shadow-xl w-full max-w-md p-6 flex flex-col gap-4"
          style={{ backgroundColor: 'var(--color-bg)' }}
        >
          <h2 className="text-lg font-semibold">
            {selectedClassroom.name}
          </h2>
          <p className="text-sm opacity-70">
            Select a template to copy to your workspace:
          </p>

          <div className="flex flex-col gap-2 max-h-96 overflow-auto">
            {selectedClassroom.templates.map((template) => (
              <button
                key={template.name}
                onClick={async () => {
                  setShowClassroomTemplateDialog(false);
                  await uploadClassroomTemplate(
                    selectedClassroom.id,
                    template.name,
                    template.files,
                  );
                  setSelectedClassroom(null);
                }}
                className="lum-btn lum-bg-blue-600 hover:lum-bg-blue-500 text-left px-4 py-3 rounded-lum-1"
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-xs opacity-70">
                  {template.files.length} file{template.files.length !== 1 ? 's' : ''}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setShowClassroomTemplateDialog(false);
              setSelectedClassroom(null);
            }}
            className="lum-btn lum-bg-transparent hover:lum-bg-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    )}
  </>;
}
