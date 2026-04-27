import { ChevronRight, File, Folder, LayoutTemplate, Plus } from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import { SelectMenuRaw, getClasses } from '@luminescent/ui-react';
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
          return !!slug && classroom.templates.length > 0;
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
      const detail = (e as CustomEvent).detail as { kind: 'file' | 'folder'; base?: string } | undefined;
      if (!detail) return;
      const base = detail.base ?? '/';
      if (detail.kind === 'file') handleFileClick(base);
      else if (detail.kind === 'folder') handleFolderClick(base);
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

  // Shared styles for the submenu surfaces so nested levels stack identically.
  const submenuCls = getClasses({
    'transition-opacity duration-300 absolute left-full top-0 lum-card p-1 gap-1 z-50 drop-shadow-xl lum-bg-gray-900 border border-gray-700/60 min-w-[12rem]': true,
    'opacity-0 pointer-events-none': true,
  });
  const itemCls = 'lum-btn lum-btn-p-1 rounded-lum-1 gap-0.5 w-full text-left lum-bg-transparent';

  return (
    <SelectMenuRaw
      id="new-button"
      className="lum-btn-p-1 rounded-lum-2 gap-1 text-xs lum-bg-green-950 hover:lum-bg-green-900"
      // Override SelectMenuRaw's default overflow-auto / max-h-72 so nested
      // hover submenus can escape the dropdown without being clipped.
      panelClass="overflow-visible! max-h-none! lum-bg-gray-900 border border-gray-700/60"
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
          className={itemCls}
        >
          <File size={16} />
          File
        </button>
        <button
          onClick={() => handleFolderClick()}
          className={itemCls}
        >
          <Folder size={16} />
          Folder
        </button>
        {templateNames.length > 0 && (
          <div className="relative group/template">
            <button className={itemCls}>
              <LayoutTemplate size={16} />
              Template
              <ChevronRight size={14} className="ml-auto opacity-70" />
            </button>
            <div
              className={getClasses({
                [submenuCls]: true,
                'group-hover/template:opacity-100 group-hover/template:pointer-events-auto': true,
              })}
            >
              {templateNames.map((name) => (
                <button
                  key={name}
                  onClick={() => uploadToPersonalWorkspace(name)}
                  className={itemCls}
                >
                  {name.replace(/[-_]/g, ' ')}
                </button>
              ))}
              {classroomTemplates.length > 0 && (
                <div className="relative group/classroom-templates">
                  <button className={itemCls}>
                    <LayoutTemplate size={16} />
                    Classroom Templates
                    <ChevronRight size={14} className="ml-auto opacity-70" />
                  </button>
                  <div
                    className={getClasses({
                      [submenuCls]: true,
                      'group-hover/classroom-templates:opacity-100 group-hover/classroom-templates:pointer-events-auto': true,
                    })}
                  >
                    {classroomTemplates.map((classroom) => (
                      <div key={classroom.id} className="relative group/classroom">
                        <button className={itemCls}>
                          {classroom.name}
                          <ChevronRight size={14} className="ml-auto opacity-70" />
                        </button>
                        <div
                          className={getClasses({
                            [submenuCls]: true,
                            'group-hover/classroom:opacity-100 group-hover/classroom:pointer-events-auto': true,
                          })}
                        >
                          {classroom.templates.map((template) => (
                            <button
                              key={template.name}
                              onClick={() => uploadClassroomTemplate(
                                classroom.id,
                                template.name,
                                template.files,
                              )}
                              className={itemCls}
                            >
                              {template.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </>}
    />
  );
}
