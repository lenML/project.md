import { describe, it, expect } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { rm, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { FileLock, safe_update_file, atomic_write_file } from "../../src/utils/lock.js";

let tmp_dir: string;

beforeEach(() => {
  tmp_dir = mkdtempSync(path.join(os.tmpdir(), "pdm-lock-"));
});

afterEach(async () => {
  await rm(tmp_dir, { recursive: true, force: true });
});

describe("FileLock", () => {
  /**
   * Acquire and release
   * Given a file path
   * When acquire is called then release
   * Then lock dir is created then removed
   */
  it("acquires and releases lock", async () => {
    const f = path.join(tmp_dir, "test.md");
    const lock = new FileLock(f);
    await lock.acquire();
    expect(existsSync(f + ".lock")).toBe(true);
    await lock.release();
    expect(existsSync(f + ".lock")).toBe(false);
  });

  /**
   * Exclusive lock
   * Given a locked file
   * When a second lock tries to acquire
   * Then it waits until released
   */
  it("blocks concurrent access", async () => {
    const f = path.join(tmp_dir, "exclusive.md");
    const lock1 = new FileLock(f);
    const lock2 = new FileLock(f);

    await lock1.acquire();
    const start = Date.now();
    // try acquire with short timeout
    await expect(lock2.acquire(100)).rejects.toThrow("lock timeout");
    expect(Date.now() - start).toBeGreaterThanOrEqual(90);
    await lock1.release();
  });

  /**
   * with_lock
   * Given a file path
   * When withLock runs a function
   * Then lock is acquired before fn and released after
   */
  it("withLock acquires and releases", async () => {
    const f = path.join(tmp_dir, "withlock.md");
    const lock = new FileLock(f);
    let inside = false;
    await lock.with_lock(async () => {
      inside = true;
      expect(existsSync(f + ".lock")).toBe(true);
    });
    expect(inside).toBe(true);
    expect(existsSync(f + ".lock")).toBe(false);
  });
});

describe("atomic_write_file", () => {
  /**
   * Atomic write
   * Given a file path and content
   * When atomic_write_file is called
   * Then content is written correctly
   */
  it("writes content atomically", async () => {
    const f = path.join(tmp_dir, "atomic.md");
    await atomic_write_file(f, "hello world");
    const content = await readFile(f, "utf-8");
    expect(content).toBe("hello world");
  });
});

describe("safe_update_file", () => {
  /**
   * Safe update
   * Given a file with content "a"
   * When safe_update_file appends "b"
   * Then final content is "ab"
   */
  it("appends content safely", async () => {
    const f = path.join(tmp_dir, "safe.md");
    await atomic_write_file(f, "a");
    await safe_update_file(f, (content) => content + "b");
    const result = await readFile(f, "utf-8");
    expect(result).toBe("ab");
  });

  /**
   * Update returns null
   * Given file content "x"
   * When update returns null
   * Then file unchanged
   */
  it("does nothing when update returns null", async () => {
    const f = path.join(tmp_dir, "nop.md");
    await atomic_write_file(f, "x");
    await safe_update_file(f, () => null);
    const result = await readFile(f, "utf-8");
    expect(result).toBe("x");
  });
});