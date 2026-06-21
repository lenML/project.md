export async function pickDirectory(write = false): Promise<FileSystemDirectoryHandle> {
  return (window as any).showDirectoryPicker({ mode: write ? 'readwrite' : 'read' });
}

export async function readTextFile(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

export async function writeTextFile(handle: FileSystemFileHandle, content: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function createFile(
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemFileHandle> {
  return dir.getFileHandle(name, { create: true });
}

export async function createDir(
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  return dir.getDirectoryHandle(name, { create: true });
}

export async function removeEntry(
  dir: FileSystemDirectoryHandle,
  name: string,
  recursive = false,
): Promise<void> {
  await dir.removeEntry(name, { recursive });
}

export interface DirEntry {
  name: string;
  handle: FileSystemDirectoryHandle | FileSystemFileHandle;
  isDir: boolean;
}

export async function listDir(handle: FileSystemDirectoryHandle): Promise<DirEntry[]> {
  const entries: DirEntry[] = [];
  for await (const entry of (handle as unknown as any).values()) {
    if (entry.name.startsWith('.')) continue;
    entries.push({ name: entry.name, handle: entry, isDir: entry.kind === 'directory' });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

export async function listDirAll(handle: FileSystemDirectoryHandle): Promise<DirEntry[]> {
  const entries: DirEntry[] = [];
  for await (const entry of (handle as unknown as any).values()) {
    entries.push({ name: entry.name, handle: entry, isDir: entry.kind === 'directory' });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

async function tryGetFile(
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemFileHandle | null> {
  try {
    return await dir.getFileHandle(name);
  } catch {
    return null;
  }
}

async function tryGetDir(
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await dir.getDirectoryHandle(name);
  } catch {
    return null;
  }
}

export async function readDir(dir: FileSystemDirectoryHandle): Promise<DirEntry[]> {
  return listDir(dir);
}

export { tryGetFile, tryGetDir };
