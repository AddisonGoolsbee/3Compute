import { Files, Folder, Upload } from "lucide-react";
import { useRef, useState, useContext } from "react";
// @ts-expect-error types not working yet
import { SelectMenuRaw } from "@luminescent/ui-react";
import { backendUrl, UserDataContext } from "../util/UserData";

export default function UploadButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const userData = useContext(UserDataContext);

  const handleFileClick = () => fileInputRef.current?.click();
  const handleFolderClick = () => folderInputRef.current?.click();

  const handleFiles = async (fileList: FileList | null, isFolder: boolean) => {
    if (!fileList || fileList.length === 0) return;

    setStatus("Uploading...");

    const formData = new FormData();
    Array.from(fileList).forEach((file) => {
      formData.append("files", file, file.webkitRelativePath || file.name);
    });

    const endpoint = isFolder
      ? `${backendUrl}/upload-folder`
      : `${backendUrl}/upload`;

    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    setStatus(res.ok ? "Upload successful" : "Upload failed");
    if (res.status === 413) {
      setStatus("Failed: File too large");
    }
    if (res.ok) {
      await userData.refreshFiles();
    }
    
    setTimeout(() => setStatus(null), 3000);
  };

  return (
    <>
      <SelectMenuRaw
        id="upload"
        className="lum-btn-p-1 rounded-lum-2 gap-1 text-xs"
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
          <button
            onClick={handleFolderClick}
            className="lum-btn lum-btn-p-1 rounded-lum-1 gap-1 text-xs lum-bg-transparent"
          >
            <Folder size={16} />
            Folder
          </button>
        </>}
      />
      <div
        className={`${
          status?.toLowerCase().includes("fail")
            ? "text-red-600"
            : "text-green-600"
        }`}
      >
        {status}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFiles(e.target.files, false)}
        className="hidden"
        multiple
      />

      <input
        type="file"
        ref={folderInputRef}
        onChange={(e) => handleFiles(e.target.files, true)}
        className="hidden"
        // @ts-expect-error webkitdirectory is not supported in all browsers
        webkitdirectory=""
        directory=""
      />
    </>
  );
}
