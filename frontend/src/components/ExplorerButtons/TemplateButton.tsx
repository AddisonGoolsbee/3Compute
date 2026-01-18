import { useEffect, useState, useContext, ChangeEvent } from 'react';
import { SelectMenuRaw } from '@luminescent/ui-react';
import { LayoutTemplate } from 'lucide-react';
import { backendUrl, UserDataContext } from '../../util/UserData';
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

export default function TemplateButton() {
  const [manifest, setManifest] = useState<Manifest>({});
  const [selected, setSelected] = useState<string>('');
  const [classroomTemplates, setClassroomTemplates] = useState<ClassroomWithTemplates[]>([]);
  const [showClassroomPickerDialog, setShowClassroomPickerDialog] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<ClassroomWithTemplates | null>(null);
  const [showClassroomTemplateDialog, setShowClassroomTemplateDialog] = useState(false);
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

  // 2) load classroom templates for students/instructors to browse
  useEffect(() => {
    if (!userData?.userInfo || !userData?.classroomSymlinks) return;

    fetch(`${backendUrl}/classrooms/templates`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const classroomsWithTemplates = Array.isArray(data.classrooms) ? data.classrooms : [];

        // Only show classrooms that are actually mounted in the user's workspace
        const availableClassrooms = classroomsWithTemplates.filter((classroom: ClassroomWithTemplates) => {
          const slug = Object.keys(userData.classroomSymlinks || {}).find(
            s => userData.classroomSymlinks?.[s]?.id === classroom.id,
          );
          return !!slug;
        });

        setClassroomTemplates(availableClassrooms);
      })
      .catch((err) => console.error('Failed to load classroom templates', err));
  }, [userData?.userInfo, userData?.classroomSymlinks]);

  const handleUseTemplate = async (templateName: string) => {
    if (!templateName) return;

    // Always upload built-in templates to personal workspace
    // Teachers can manually copy to classroom folders if needed
    await uploadToPersonalWorkspace(templateName);
  };

  const uploadToPersonalWorkspace = async (templateName: string) => {
    setStatus('Uploading template…');

    const files = manifest[templateName] || [];
    const formData = new FormData();

    try {
      // Fetch each file from public/templates/<selected>/
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

      // POST to your existing endpoint
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

  const uploadClassroomTemplate = async (classroomId: string, templateName: string, files: string[]) => {
    setStatus('Copying template from classroom…');

    try {
      // Find the classroom folder in the user's file list
      const classroomSymlinks = userData.classroomSymlinks || {};

      const classroomSlug = Object.keys(classroomSymlinks).find(
        slug => classroomSymlinks[slug]?.id === classroomId,
      );

      if (!classroomSlug) {
        console.error('Classroom not found. Available symlinks:', Object.keys(classroomSymlinks));
        throw new Error(
          'Classroom folder not mounted. Try refreshing the page or logging out and back in.',
        );
      }

      const formData = new FormData();

      let resolvedBase: 'classroom-templates' | 'templates' | null = null;

      const classroomRoot = `/${classroomSlug}`;

      const fetchFile = async (filename: string): Promise<Blob> => {
        const baseCandidates: Array<'classroom-templates' | 'templates'> = resolvedBase
          ? [resolvedBase]
          : ['classroom-templates', 'templates'];

        for (const base of baseCandidates) {
          const url = `${backendUrl}/file/${classroomSlug}/${base}/${templateName}/${filename}`;
          const res = await fetch(url, { credentials: 'include' });
          if (res.ok) {
            if (!resolvedBase) {
              resolvedBase = base;
            }
            return await res.blob();
          }
          if (res.status === 404) {
            continue;
          }
          const errorText = await res.text().catch(() => '');
          throw new Error(`Failed to fetch ${filename}: ${res.status} ${errorText}`);
        }

        throw new Error(`Failed to fetch ${filename}: 404`);
      };

      // Fetch all files first to determine the base path
      const fetchedFiles = await Promise.all(
        files.map(async (filename) => {
          const blob = await fetchFile(filename);
          return { filename, blob };
        }),
      );

      // Now determine the base path after all files are fetched
      const basePath = resolvedBase === 'classroom-templates' ? 'classroom-templates' : '';

      // Add files to formData with the correct paths
      for (const { filename, blob } of fetchedFiles) {
        const filePath = basePath
          ? `${classroomSlug}/${basePath}/${templateName}/${filename}`
          : `${classroomSlug}/${templateName}/${filename}`;
        formData.append('files', blob, filePath);
      }

      // Add move-into parameter
      const moveInto = basePath
        ? `${classroomSlug}/${basePath}/${templateName}`
        : `${classroomSlug}/${templateName}`;
      formData.append('move-into', moveInto);

      // POST to personal workspace upload
      const res = await fetch(`${backendUrl}/upload-folder`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Upload failed:', res.status, errorText);
        throw new Error(`Upload failed: ${res.status} ${errorText}`);
      }

      setStatus('Template copied to workspace!');
      await userData.refreshFiles();

      // Expand the uploaded template folder
      const templateFolderLocation = basePath
        ? `${classroomRoot}/${basePath}/${templateName}`
        : `${classroomRoot}/${templateName}`;

      // Expand parent folders too if needed
      const foldersToOpen = [classroomRoot];
      if (basePath) {
        foldersToOpen.push(`${classroomRoot}/${basePath}`);
      }
      foldersToOpen.push(templateFolderLocation);

      userData.setOpenFolders((prev) => {
        const newFolders = foldersToOpen.filter(f => !prev.includes(f));
        return newFolders.length > 0 ? [...prev, ...newFolders] : prev;
      });
    } catch (error) {
      console.error('Classroom template copy error:', error);
      setStatus(
        `Copy failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }

    setTimeout(() => setStatus(null), 3000);
  };

  const templateNames = Object.keys(manifest);

  if (!templateNames.length) {
    return <div className="lum-loading animate-spin w-4 h-4" />;
  }

  // Build values list with classroom templates first if available
  const selectValues = [];

  if (classroomTemplates.length > 0) {
    selectValues.push({
      name: 'Classroom Templates',
      value: '__classroom_templates__',
    });
  }

  selectValues.push(...templateNames.map((name) => ({
    name: name.replace(/[-_]/g, ' '),
    value: name,
  })));

  return (
    <>
      <SelectMenuRaw
        id="template-select"
        className="lum-btn-p-1 rounded-lum-2 gap-1 text-xs lum-bg-blue-950 hover:lum-bg-blue-900 w-full"
        value={selected}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
          const templateName = e.target.value;
          setSelected(templateName);
          if (templateName === '__classroom_templates__') {
            // Show classroom picker dialog
            setShowClassroomPickerDialog(true);
          } else if (templateName) {
            handleUseTemplate(templateName);
          }
        }}
        values={selectValues}
        customDropdown
        dropdown={
          <div className="flex items-center gap-1">
            <LayoutTemplate size={16} />
            Templates
          </div>
        }
      />

      {/* Classroom Picker Dialog */}
      {showClassroomPickerDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => {
              setShowClassroomPickerDialog(false);
              setSelected('');
            }}
          />
          <div
            className="relative border border-white/10 rounded-lg shadow-xl w-full max-w-md p-6 flex flex-col gap-4"
            style={{ backgroundColor: 'var(--color-bg)' }}
          >
            <h2 className="text-lg font-semibold">Choose a Classroom</h2>
            <p className="text-sm opacity-70">
              Select a classroom to browse its templates:
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
                    {classroom.templates.length} template{classroom.templates.length !== 1 ? 's' : ''} available
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowClassroomPickerDialog(false);
                setSelected('');
              }}
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
              setSelected('');
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
                    setSelected('');
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
                setSelected('');
              }}
              className="lum-btn lum-bg-transparent hover:lum-bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
