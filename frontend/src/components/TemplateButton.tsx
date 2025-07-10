import { useEffect, useState } from "react";
// @ts-expect-error types not working yet
import { SelectMenuRaw } from "@luminescent/ui-react";
import { UserInfo } from "../root";
import { LayoutTemplate } from "lucide-react";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

type Manifest = Record<string, string[]>;

export default function TemplatePicker({ userInfo }: { userInfo: UserInfo }) {
  const [manifest, setManifest] = useState<Manifest>({});
  const [selected, setSelected] = useState<string>("");
  const [status, setStatus] = useState<string | null>(null);

  // 1) load the manifest once on mount
  useEffect(() => {
    fetch("/templateProjects/manifest.json")
      .then((res) => res.json())
      .then((data: Manifest) => {
        setManifest(data);
      })
      .catch((err) => console.error("Failed to load template manifest", err));
  }, []);

  const handleUseTemplate = async (templateName: string) => {
    if (!templateName) return;
    setStatus("Uploading template…");

    const files = manifest[templateName] || [];
    const formData = new FormData();

    try {
      // 2) fetch each file from public/templates/<selected>/
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
          if (templateName === "Website" && filename === "main.py") {
            modifiedText = text.replace(
              /8000/g,
              userInfo.port_start.toString()
            );
          }

          // Convert back to blob for FormData
          const fileBlob = new Blob([modifiedText], { type: blob.type });
          // Preserve folder structure by prefixing with template name
          const filePath = `${templateName}/${filename}`;
          formData.append("files", fileBlob, filePath);
        })
      );

      // 3) POST to your existing endpoint
      const res = await fetch(`${backendUrl}/upload-folder`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errorText}`);
      }

      setStatus("Template uploaded!");
    } catch (error) {
      console.error("Template upload error:", error);
      setStatus(
        `Upload failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    setTimeout(() => setStatus(null), 3000);
  };

  const templateNames = Object.keys(manifest);

  if (!templateNames.length) {
    return <div className="lum-loading animate-spin w-4 h-4" />;
  }

  return (
    <div className="flex flex-row gap-2">
      {status && (
        <div
          className={
            status.includes("failed") ? "text-red-600" : "text-green-600"
          }
        >
          {status}
        </div>
      )}
      <SelectMenuRaw
        id="template-select"
        className="lum-bg-blue-700 hover:lum-bg-blue-600"
        value={selected}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          const templateName = e.target.value;
          setSelected(templateName);
          if (templateName) {
            handleUseTemplate(templateName);
          }
        }}
        values={templateNames.map((name) => ({
          name: name.replace(/[-_]/g, " "),
          value: name,
        }))}
        customDropdown
        dropdown={
          <div className="flex items-center gap-2">
            <LayoutTemplate size={20} />
            Use a template
          </div>
        }
      />
    </div>
  );
}
