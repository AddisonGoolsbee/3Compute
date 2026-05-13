export async function uploadLocalFiles(
  files: FileList | File[],
  destination: string,
  apiUrl: string,
  setStatus: (s: string | null) => void,
  refreshFiles: () => Promise<void>,
) {
  if (!files || (files as FileList).length === 0) return;
  setStatus('Uploading...');

  // Mirror /files/move's 409-then-retry-with-overwrite handshake so users
  // get the same "Replace? This cannot be undone." prompt as on rename /
  // drag-move. POST once without `overwrite`; if anything collides, prompt
  // and re-POST with `overwrite=true`.
  const post = async (overwrite: boolean) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file, file.name));
    if (destination && destination !== '/') formData.append('destination', destination.replace(/^\/|\/$/g, ''));
    if (overwrite) formData.append('overwrite', 'true');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);
    try {
      return await fetch(`${apiUrl}/files/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    let res = await post(false);
    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      const conflicts: string[] = Array.isArray(body.conflicts) ? body.conflicts : [];
      const where =
        !destination || destination === '/' ? 'at root' : `in "${destination}"`;
      const list = conflicts.length === 1
        ? `"${conflicts[0]}" already exists ${where}`
        : `${conflicts.length} files already exist ${where} (${conflicts.slice(0, 3).map((c) => `"${c}"`).join(', ')}${conflicts.length > 3 ? ', …' : ''})`;
      const confirmed = window.confirm(`${list}. Replace? This cannot be undone.`);
      if (!confirmed) {
        setStatus('Upload cancelled');
        return;
      }
      res = await post(true);
    }
    if (res.ok) {
      setStatus('Upload successful');
      try {
        await refreshFiles();
      } catch (err) {
        // The upload itself succeeded — don't downgrade that to a generic
        // failure if the followup tree refresh hiccups.
        console.error('refreshFiles failed after upload', err);
      }
    } else {
      const body = await res.text().catch(() => '');
      let detail = body;
      try {
        const parsed = JSON.parse(body);
        detail = parsed.detail ?? parsed.error ?? body;
      } catch { /* not JSON */ }
      setStatus(detail ? `Upload failed: ${detail}` : `Upload failed (${res.status})`);
    }
  } catch (err) {
    console.error('Upload network/abort error', err);
    const msg = err instanceof Error ? err.message : 'network error';
    setStatus(`Upload failed: ${msg}`);
  } finally {
    setTimeout(() => setStatus(null), 2500);
  }
}

// ---------------------------------------------------------------------------
// Folder-aware drop upload
// ---------------------------------------------------------------------------

type CollectedEntry = { file: File; path: string };

// Walk a FileSystemEntry depth-first, pushing {file, path} into `out`. `path`
// is the relative path from the drop, with the root entry's name as the first
// segment — matches what /files/upload-folder expects in the multipart name.
async function walkEntry(
  entry: FileSystemEntry,
  prefix: string,
  out: CollectedEntry[],
): Promise<void> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    const file = await new Promise<File>((resolve, reject) =>
      fileEntry.file(resolve, reject),
    );
    out.push({ file, path: prefix + entry.name });
    return;
  }
  if (!entry.isDirectory) return;
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  // readEntries returns a *batch* (typically 100) — loop until we get an empty
  // batch, otherwise we silently miss files in directories with >100 entries.
  const children: FileSystemEntry[] = [];

  while (true) {
    const batch: FileSystemEntry[] = await new Promise((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (batch.length === 0) break;
    children.push(...batch);
  }
  for (const child of children) {
    await walkEntry(child, prefix + entry.name + '/', out);
  }
}

/**
 * Upload everything dropped from an OS drag — files AND folders. Walks the
 * DataTransfer items via webkitGetAsEntry; if any folders were dropped, posts
 * to /files/upload-folder (which auto-renames the top-level on collision,
 * mirroring the Upload-folder button). Otherwise falls back to the flat-file
 * path with the 409 "Replace?" prompt.
 *
 * Synchronously extracts entries from `dataTransfer.items` before awaiting
 * anything — the items list is only guaranteed valid during the drop event.
 */
export async function uploadDroppedItems(
  dataTransfer: DataTransfer,
  destination: string,
  apiUrl: string,
  setStatus: (s: string | null) => void,
  refreshFiles: () => Promise<void>,
) {
  // Grab entries synchronously; once we await, dataTransfer.items may be
  // invalidated by the browser.
  const items = dataTransfer.items;
  const entries: FileSystemEntry[] = [];
  let sawDirectory = false;
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (typeof it.webkitGetAsEntry !== 'function') continue;
      const entry = it.webkitGetAsEntry();
      if (!entry) continue;
      entries.push(entry);
      if (entry.isDirectory) sawDirectory = true;
    }
  }

  // No entries API support (old browser) or empty items — fall back to the
  // plain file list. Folders won't expand in that case but files still upload.
  if (entries.length === 0) {
    if (dataTransfer.files && dataTransfer.files.length > 0) {
      await uploadLocalFiles(dataTransfer.files, destination, apiUrl, setStatus, refreshFiles);
    }
    return;
  }

  if (!sawDirectory) {
    // Flat file drop — use the 409-prompt path so users see the same
    // "Replace?" UX as on rename / drag-move.
    const fileList: File[] = [];
    for (const entry of entries) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File | null>((resolve) =>
        fileEntry.file(resolve, () => resolve(null)),
      );
      if (file) fileList.push(file);
    }
    if (fileList.length > 0) {
      await uploadLocalFiles(fileList, destination, apiUrl, setStatus, refreshFiles);
    }
    return;
  }

  // Folder drop — walk every entry, then hand the flat file list to the
  // shared folder-upload helper so we get the same 409 prompt as the
  // Upload→Folder button.
  setStatus('Uploading...');
  const collected: CollectedEntry[] = [];
  try {
    for (const entry of entries) {
      await walkEntry(entry, '', collected);
    }
  } catch (err) {
    console.error('Failed walking dropped folders', err);
    setStatus('Upload failed: could not read folder');
    setTimeout(() => setStatus(null), 2500);
    return;
  }
  if (collected.length === 0) {
    setStatus(null);
    return;
  }
  await uploadFolderFiles(
    collected.map(({ file, path }) => ({ file, path })),
    destination,
    apiUrl,
    setStatus,
    refreshFiles,
  );
}

/**
 * POST a list of `{file, path}` pairs to /files/upload-folder, mirroring the
 * /files/move 409-then-retry prompt at the top-level folder granularity.
 * `path` is the multipart name the backend sees — relative slashed paths like
 * `solution/main.py` create the directory structure on disk.
 */
export async function uploadFolderFiles(
  entries: { file: File; path: string }[],
  destination: string,
  apiUrl: string,
  setStatus: (s: string | null) => void,
  refreshFiles: () => Promise<void>,
) {
  if (entries.length === 0) return;
  setStatus('Uploading...');
  const dest = destination.replace(/^\/|\/$/g, '');
  const post = async (overwrite: boolean) => {
    const formData = new FormData();
    for (const { file, path } of entries) {
      formData.append('files', file, path);
    }
    if (dest) formData.append('destination', dest);
    if (overwrite) formData.append('overwrite', 'true');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);
    try {
      return await fetch(`${apiUrl}/files/upload-folder`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    let res = await post(false);
    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      const conflicts: string[] = Array.isArray(body.conflicts) ? body.conflicts : [];
      const where = !dest ? 'at root' : `in "${dest}"`;
      const list = conflicts.length === 1
        ? `"${conflicts[0]}" already exists ${where}`
        : `${conflicts.length} items already exist ${where} (${conflicts.slice(0, 3).map((c) => `"${c}"`).join(', ')}${conflicts.length > 3 ? ', …' : ''})`;
      const confirmed = window.confirm(`${list}. Replace? The existing folder will be deleted. This cannot be undone.`);
      if (!confirmed) {
        setStatus('Upload cancelled');
        setTimeout(() => setStatus(null), 2500);
        return;
      }
      res = await post(true);
    }
    if (res.ok) {
      setStatus('Upload successful');
      try {
        await refreshFiles();
      } catch (err) {
        console.error('refreshFiles failed after folder upload', err);
      }
    } else {
      const body = await res.text().catch(() => '');
      let detail = body;
      try {
        const parsed = JSON.parse(body);
        detail = parsed.detail ?? parsed.error ?? body;
      } catch { /* not JSON */ }
      setStatus(detail ? `Upload failed: ${detail}` : `Upload failed (${res.status})`);
    }
  } catch (err) {
    console.error('Folder upload network/abort error', err);
    const msg = err instanceof Error ? err.message : 'network error';
    setStatus(`Upload failed: ${msg}`);
  } finally {
    setTimeout(() => setStatus(null), 2500);
  }
}
