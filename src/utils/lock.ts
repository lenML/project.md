import { mkdir, rm, rename } from "node:fs/promises";
import { writeFile, readFile } from "node:fs/promises";

/**
 * 基于 mkdir 的文件锁（跨平台原子操作）。
 * mkdir 成功即获得锁，释放时删除目录。
 */
export class FileLock {
  private lock_dir: string;

  constructor(private file_path: string) {
    this.lock_dir = file_path + ".lock";
  }

  /** 尝试获取锁，重试直到超时（ms）。 */
  async acquire(timeout = 5000): Promise<void> {
    const deadline = Date.now() + timeout;
    let last_err: Error | null = null;
    while (Date.now() < deadline) {
      try {
        await mkdir(this.lock_dir, { recursive: false });
        return;
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code === "EEXIST") {
          last_err = err as Error;
          await sleep(50);
          continue;
        }
        throw err;
      }
    }
    throw new Error(
      "lock timeout: " + this.file_path + " (" + (last_err?.message || "EEXIST") + ")",
    );
  }

  /** 释放锁。 */
  async release(): Promise<void> {
    await rm(this.lock_dir, { recursive: true, force: true }).catch(() => {/* ignore */});
  }

  /**
   * 获取锁后执行 fn，自动释放锁。
   * 无论成功或抛出，锁最终释放。
   */
  async with_lock<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      await this.release();
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 原子性写入文件（临时文件 + rename，同一文件系统 rename 原子）。
 */
export async function atomic_write_file(
  file_path: string,
  content: string,
): Promise<void> {
  const tmp_path = file_path + ".tmp." + process.pid + "." + Date.now();
  await writeFile(tmp_path, content, "utf-8");
  await rename(tmp_path, file_path);
}

/**
 * 安全更新文件内容：锁 + 原子写入。
 * update 接收当前内容，返回新内容；返回 null 表示不修改。
 */
export async function safe_update_file(
  file_path: string,
  update: (content: string | null) => string | null,
  timeout = 5000,
): Promise<void> {
  const lock = new FileLock(file_path);
  await lock.acquire(timeout);
  try {
    let content: string | null = null;
    try {
      content = await readFile(file_path, "utf-8");
    } catch {
      content = null;
    }
    const updated = update(content);
    if (updated !== null && updated !== content) {
      await atomic_write_file(file_path, updated);
    }
  } finally {
    await lock.release();
  }
}