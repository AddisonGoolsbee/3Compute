import { useContext } from "react";
import { FolderIcon, Pencil, Trash } from "lucide-react";
import { defaultUserData, UserDataContext } from "../util/UserData";
import UploadButton from "./UploadButton";
import MenuItems from "./MenuItems";
import TemplateButton from "./TemplateButton";

export default function Explorer() {
  const userData = useContext(UserDataContext);

  return (
    <div className="flex flex-1 flex-col lum-card gap-1 p-1 lum-bg-gray-950 border-lum-border/30">
      <div className="flex items-center gap-2 p-1 pl-2 lum-bg-gray-900 rounded-lum-1">
        <FolderIcon size={20} />
        <span className="flex-1">Files</span>
        <div>
          <UploadButton />
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {Array.isArray(userData?.files) ? (
          <MenuItems files={userData?.files} />
        ) : userData?.userInfo ? (
          <div className="text-red-500">Error loading files</div>
        ) : (
          <MenuItems files={defaultUserData.files} />
        )}
      </div>
      {userData?.userInfo && (
        <div className="flex flex-col">
          <TemplateButton userInfo={userData?.userInfo} />
        </div>
      )}
      <div id="context-menu" className="flex flex-col transition-all opacity-0 pointer-events-none absolute z-50 lum-bg-gray-900 text-white rounded-lum shadow-lg gap-1 p-1">
        <button className="lum-btn cursor-pointer lum-btn-p-1 rounded-lum-1 lum-bg-transparent">
          <Pencil size={16} />
          Rename
        </button>
        <button className="lum-btn cursor-pointer lum-btn-p-1 rounded-lum-1 lum-bg-transparent">
          <Trash size={16} />
          Delete
        </button>
      </div>
    </div>
  );
}
