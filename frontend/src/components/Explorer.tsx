import { useContext } from "react";
import { FolderIcon } from "lucide-react";
import { defaultUserData, UserDataContext } from "../util/UserData";
import UploadButton from "./UploadButton";
import MenuItems from "./MenuItems";
import TemplateButton from "./TemplateButton";

export default function Explorer() {
  const userData = useContext(UserDataContext);

  return (
    <div className="flex flex-col w-1/4 lum-card gap-1 p-1 lum-bg-gray-950 border-lum-border/30">
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
    </div>
  );
}
