export async function uploadLocalFiles(
  files: FileList | File[],
  destination: string,
  apiUrl: string,
  setStatus: (s: string | null) => void,
  refreshFiles: () => Promise<void>,
) {
  if (!files || (files as FileList).length === 0) return;
  setStatus('Uploading...');
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('files', file, file.name));
  if (destination && destination !== '/') formData.append('destination', destination.replace(/^\/|\/$/g, ''));
  try {
    const res = await fetch(`${apiUrl}/files/upload`, { method: 'POST', body: formData, credentials: 'include' });
    setStatus(res.ok ? 'Upload successful' : 'Upload failed');
    if (res.ok) await refreshFiles();
  } catch {
    setStatus('Upload failed: network error');
  } finally {
    setTimeout(() => setStatus(null), 1500);
  }
}
