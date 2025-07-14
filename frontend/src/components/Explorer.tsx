import { useContext, useState } from "react";
import { FolderIcon } from "lucide-react";
import { defaultUserData, UserDataContext } from "../util/UserData";
import UploadButton from "./UploadButton";
import MenuItems from "./MenuItems";
import TemplateButton from "./TemplateButton";
// @ts-expect-error types not working yet
import { getClasses } from "@luminescent/ui-react";
import { StatusContext } from "../util/Files";

export default function Explorer() {
  const userData = useContext(UserDataContext);
  const [status, setStatus] = useState<string | null>(null);

  return <StatusContext value={{ status, setStatus }}>
    <div className="flex max-w-1/4 flex-1 flex-col lum-card gap-1 p-1 lum-bg-gray-950 border-lum-border/30">
      <div className={getClasses({
        "transition-all duration-500 flex items-center gap-2 p-1 pl-2 lum-bg-gray-900 rounded-lum-1": true,
        "rounded-b-sm": status,
      })}>
        <FolderIcon size={20} />
        <span className="flex-1">
          Files
        </span>
        <div>
          <UploadButton />
        </div>
      </div>
      <div className={getClasses({
        "transition-all duration-500 flex items-center gap-2 p-1 pl-2 lum-bg-gray-900 rounded-lum-1 rounded-t-sm": true,
        "-mt-9 opacity-0 pointer-events-none": !status,
      })}>
        <div className="lum-loading w-4 h-4 m-0.5 border-2" />
        <span className="flex-1">
          {status}
        </span>
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
  </StatusContext>;
}
