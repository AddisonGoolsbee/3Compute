import { Files, Folder, Upload } from 'lucide-react';
import { useRef, useContext, useState } from 'react';
import { SelectMenuRaw } from '@luminescent/ui-react';
import { backendUrl, UserDataContext } from '../../util/UserData';
import { StatusContext } from '../../util/Files';

export default function UploadButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [menuKey, setMenuKey] = useState(0);
  const { setStatus } = useContext(StatusContext);
  const userData = useContext(UserDataContext);

  const handleFileClick = () => fileInputRef.current?.click();
  const handleFolderClick = () => folderInputRef.current?.click();

  const handleFiles = async (fileList: FileList | null, isFolder: boolean) => {
    if (!fileList || fileList.length === 0) return;

    setStatus('Uploading...');
    // Force remount of the dropdown to collapse it
    setMenuKey((k) => k + 1);

    const formData = new FormData();
    Array.from(fileList).forEach((file) => {
      formData.append('files', file, file.webkitRelativePath || file.name);
    });

    const endpoint = isFolder
      ? `${backendUrl}/upload-folder`
      : `${backendUrl}/upload`;

    // Add a timeout so we don't hang forever on network/proxy issues
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 minutes

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: controller.signal,
      });

      setStatus(res.ok ? 'Upload successful' : 'Upload failed');
      if (res.status === 413) {
        setStatus('Failed: File too large');
      }
      if (res.ok) {
        await userData.refreshFiles();
      }
    } catch {
      // Network error, timeout, or abort
      setStatus('Upload failed: network error');
    } finally {
      clearTimeout(timeoutId);
      setTimeout(() => setStatus(null), 1000);
    }
  };

  return <SelectMenuRaw
    key={menuKey}
    id="upload"
    className="lum-btn-p-1 rounded-lum-2 gap-1 text-xs lum-bg-purple-950 hover:lum-bg-purple-900"
    customDropdown
    dropdown={
      <div className="flex items-center gap-1">
        <Upload size={16} />
        Upload
      </div>
    }
    extra-buttons={<>
      <button
        onClick={handleFileClick}
        className="lum-btn lum-btn-p-1 rounded-lum-1 gap-1 text-xs lum-bg-transparent"
      >
        <Files size={16} />
        Files
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFiles(e.target.files, false)}
        className="hidden"
        multiple
      />
      <button
        onClick={handleFolderClick}
        className="lum-btn lum-btn-p-1 rounded-lum-1 gap-1 text-xs lum-bg-transparent"
      >
        <Folder size={16} />
        Folder
      </button>
      <input
        type="file"
        ref={folderInputRef}
        onChange={(e) => handleFiles(e.target.files, true)}
        className="hidden"
        // @ts-expect-error webkitdirectory is not supported in all browsers
        webkitdirectory=""
        directory=""
      />
    </>}
  />;
}
