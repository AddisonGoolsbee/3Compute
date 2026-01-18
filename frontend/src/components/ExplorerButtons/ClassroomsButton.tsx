import { useEffect, useState, useContext } from 'react';
import { GraduationCap } from 'lucide-react';
import { backendUrl, UserDataContext } from '../../util/UserData';
import { StatusContext } from '../../util/Files';

interface ClassroomTemplate {
  name: string;
  files: string[];
}

interface ClassroomWithTemplates {
  id: string;
  name: string;
  templates: ClassroomTemplate[];
}

export default function ClassroomsButton() {
  const [classroomTemplates, setClassroomTemplates] = useState<ClassroomWithTemplates[]>([]);
  const [showClassroomPickerDialog, setShowClassroomPickerDialog] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<ClassroomWithTemplates | null>(null);
  const [showClassroomTemplateDialog, setShowClassroomTemplateDialog] = useState(false);
  const { setStatus } = useContext(StatusContext);
  const userData = useContext(UserDataContext);

  // Load classroom templates for students/instructors
  useEffect(() => {
    if (!userData?.userInfo || !userData?.classroomSymlinks) return;
    
    // Check if user has any classrooms
    const symlinks = userData.classroomSymlinks || {};
    if (Object.keys(symlinks).length === 0) return;
    
    fetch(`${backendUrl}/classrooms/templates`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const classroomsWithTemplates = Array.isArray(data.classrooms) ? data.classrooms : [];
        
        // Only show classrooms that are actually mounted in the user's workspace
        const availableClassrooms = classroomsWithTemplates.filter((classroom: ClassroomWithTemplates) => {
          const slug = Object.keys(symlinks).find(
            s => symlinks[s]?.id === classroom.id
          );
          return !!slug;
        });
        
        setClassroomTemplates(availableClassrooms);
      })
      .catch((err) => console.error('Failed to load classroom templates', err));
  }, [userData?.userInfo, userData?.classroomSymlinks]);

  const copyTemplateToWorkspace = async (classroomId: string, templateName: string, files: string[]) => {
    setStatus('Copying template to your workspace…');

    try {
      const classroomSymlinks = userData.classroomSymlinks || {};
      
      const classroomSlug = Object.keys(classroomSymlinks).find(
        slug => classroomSymlinks[slug]?.id === classroomId
      );

      if (!classroomSlug) {
        throw new Error('Classroom folder not mounted. Try refreshing the page.');
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
            if (!resolvedBase) resolvedBase = base;
            return await res.blob();
          }
          if (res.status === 404) continue;
          const errorText = await res.text().catch(() => '');
          throw new Error(`Failed to fetch ${filename}: ${res.status} ${errorText}`);
        }
        throw new Error(`Failed to fetch ${filename}: 404`);
      };

      // Fetch all files
      const fetchedFiles = await Promise.all(
        files.map(async (filename) => {
          const blob = await fetchFile(filename);
          return { filename, blob };
        }),
      );

      // Copy to the user's workspace within the classroom (not in templates folder)
      // The destination is: /{classroomSlug}/{templateName}/...
      for (const { filename, blob } of fetchedFiles) {
        const filePath = `${classroomSlug}/${templateName}/${filename}`;
        formData.append('files', blob, filePath);
      }

      formData.append('move-into', `${classroomSlug}/${templateName}`);

      const res = await fetch(`${backendUrl}/upload-folder`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Copy failed: ${res.status} ${errorText}`);
      }

      setStatus('Template copied!');
      await userData.refreshFiles();

      // Expand the folder
      const templateFolderLocation = `${classroomRoot}/${templateName}`;
      userData.setOpenFolders((prev) => {
        const foldersToOpen = [classroomRoot, templateFolderLocation];
        const newFolders = foldersToOpen.filter(f => !prev.includes(f));
        return newFolders.length > 0 ? [...prev, ...newFolders] : prev;
      });
    } catch (error) {
      console.error('Classroom template copy error:', error);
      setStatus(`Copy failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    setTimeout(() => setStatus(null), 2000);
  };

  // Only show if user has classrooms with templates
  const hasClassrooms = Object.keys(userData?.classroomSymlinks || {}).length > 0;
  if (!hasClassrooms) return null;

  return (
    <>
      <button
        onClick={() => setShowClassroomPickerDialog(true)}
        className="lum-btn lum-btn-p-1 rounded-lum-2 gap-1 text-xs lum-bg-purple-900 hover:lum-bg-purple-800 w-full flex items-center justify-center"
      >
        <GraduationCap size={16} />
        Classrooms
      </button>

      {/* Classroom Picker Dialog */}
      {showClassroomPickerDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowClassroomPickerDialog(false)}
          />
          <div
            className="relative border border-white/10 rounded-lg shadow-xl w-full max-w-md p-6 flex flex-col gap-4"
            style={{ backgroundColor: 'var(--color-bg)' }}
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <GraduationCap size={20} />
              Classroom Templates
            </h2>
            <p className="text-sm opacity-70">
              Select a classroom to browse its templates:
            </p>

            <div className="flex flex-col gap-2 max-h-96 overflow-auto">
              {classroomTemplates.length === 0 ? (
                <div className="text-center text-sm opacity-50 py-4">
                  No templates available in your classrooms yet.
                </div>
              ) : (
                classroomTemplates.map((classroom) => (
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
                ))
              )}
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

      {/* Template Picker Dialog */}
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
            <h2 className="text-lg font-semibold">{selectedClassroom.name}</h2>
            <p className="text-sm opacity-70">
              Select a template to copy to your workspace:
            </p>

            <div className="flex flex-col gap-2 max-h-96 overflow-auto">
              {selectedClassroom.templates.map((template) => (
                <button
                  key={template.name}
                  onClick={async () => {
                    setShowClassroomTemplateDialog(false);
                    await copyTemplateToWorkspace(
                      selectedClassroom.id,
                      template.name,
                      template.files
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
    </>
  );
}
