import { useEffect, useState } from "react";
import { UserInfo } from "../App";

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
        if (templateName === "website" && filename === "main.py") {
          modifiedText = text.replace(/8000/g, userInfo.port_start.toString());
        }

        // Convert back to blob for FormData
        const fileBlob = new Blob([modifiedText], { type: blob.type });
        // Preserve folder structure by prefixing with template name
        const filePath = `${templateName}/${filename}`;
        formData.append("files", fileBlob, filePath);
      })
    );

    // 3) POST to your existing endpoint
    const res = await fetch(`${backendUrl}/api/upload-folder`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    setStatus(res.ok ? "Template uploaded!" : "Upload failed");
    setTimeout(() => setStatus(null), 3000);
  };

  const handleSelectChange = (templateName: string) => {
    setSelected(templateName);
    if (templateName) {
      handleUseTemplate(templateName);
    }
  };

  const templateNames = Object.keys(manifest);

  if (!templateNames.length) {
    return <div>Loading templates…</div>;
  }

  return (
    <div className="flex flex-row gap-2">
      <div className="flex items-center gap-2 flex-col">
        <label className="font-semibold">Use a template:</label>
        <select
          value={selected}
          onChange={(e) => handleSelectChange(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="">---------</option>
          {templateNames.map((name) => (
            <option key={name} value={name}>
              {name.replace(/[-_]/g, " ")}
            </option>
          ))}
        </select>
      </div>
      {status && (
        <div
          className={
            status.includes("failed") ? "text-red-600" : "text-green-600"
          }
        >
          {status}
        </div>
      )}
    </div>
  );
}
