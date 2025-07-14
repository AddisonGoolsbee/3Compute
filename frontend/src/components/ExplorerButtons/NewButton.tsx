import { File, Folder, Plus } from "lucide-react";
import { useContext } from "react";
// @ts-expect-error types not working yet
import { SelectMenuRaw } from "@luminescent/ui-react";
import { UserDataContext } from "../../util/UserData";

export default function NewButton() {
  const userData = useContext(UserDataContext);

  const handleFileClick = () => {
    if (!userData.files) return;
    const newFIle = {
      name: "new_file",
      location: "/new_file",
      renaming: true, // Set renaming to true to allow immediate editing
    };
    userData.setFilesClientSide([...userData.files, newFIle]);
  };

  return <SelectMenuRaw
    id="upload"
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
        onClick={handleFileClick}
        className="lum-btn lum-btn-p-1 rounded-lum-1 gap-1 text-xs lum-bg-transparent"
      >
        <File size={16} />
        File
      </button>
      <button
        className="lum-btn lum-btn-p-1 rounded-lum-1 gap-1 text-xs lum-bg-transparent"
      >
        <Folder size={16} />
        Folder
      </button>
    </>}
  />;
}
