export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  return (window as any).showDirectoryPicker({ mode: "read" });
}

export async function readTextFile(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

interface DirEntry {
  name: string;
  handle: FileSystemDirectoryHandle | FileSystemFileHandle;
  isDir: boolean;
}

export async function listDir(handle: FileSystemDirectoryHandle): Promise<DirEntry[]> {
  const entries: DirEntry[] = [];
  for await (const entry of (handle as unknown as any).values()) {
    if (entry.name.startsWith(".")) continue;
    entries.push({ name: entry.name, handle: entry, isDir: entry.kind === "directory" });
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
