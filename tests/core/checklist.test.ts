import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { project_init } from "../../src/core/project.js";
import { kanban_init } from "../../src/core/kanban.js";
import { column_init } from "../../src/core/column.js";
import {
  validate_checkboxes_all_done,
  item_move_with_check,
} from "../../src/core/checklist.js";
import { item_new, item_list } from "../../src/core/item.js";

let tmp_dir: string;
let column_src: string;
let column_dst: string;

beforeEach(async () => {
  tmp_dir = mkdtempSync(path.join(os.tmpdir(), "pdm-test-"));
  const proj_dir = await project_init(tmp_dir, "test-proj");
  const kanban_dir = await kanban_init(proj_dir, "dev");
  column_src = await column_init(kanban_dir, "todo");
  column_dst = await column_init(kanban_dir, "done");
});

afterEach(async () => {
  await rm(tmp_dir, { recursive: true, force: true });
});

describe("validate_checkboxes_all_done", () => {
  /**
   * All checked
   * Given an item where all checkboxes are "[x]"
   * When validate_checkboxes_all_done is called
   * Then it returns { ok: true }
   */
  it("returns ok when all checkboxes checked", async () => {
    const item = await item_new(column_src, "全完成");
    const content = (await import("node:fs/promises")).readFile(item.file_path, "utf-8");
    await writeFile(item.file_path, (await content) + "- [x] a\n- [x] b\n", "utf-8");
    const result = await validate_checkboxes_all_done(item.file_path);
    expect(result.ok).toBe(true);
  });

  /**
   * Some unchecked
   * Given an item with unchecked checkboxes
   * When validate_checkboxes_all_done is called
   * Then it returns { ok: false, message }
   */
  it("returns fail when some checkboxes unchecked", async () => {
    const item = await item_new(column_src, "有未完成");
    const content = (await import("node:fs/promises")).readFile(item.file_path, "utf-8");
    await writeFile(item.file_path, (await content) + "- [x] done\n- [ ] pending\n", "utf-8");
    const result = await validate_checkboxes_all_done(item.file_path);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("pending");
    expect(result.message).toContain("1");
  });

  /**
   * No checkboxes
   * Given an item with no checkboxes at all
   * When validate_checkboxes_all_done is called
   * Then it returns { ok: true } (nothing to block)
   */
  it("returns ok when no checkboxes exist", async () => {
    const item = await item_new(column_src, "无checkbox");
    const result = await validate_checkboxes_all_done(item.file_path);
    expect(result.ok).toBe(true);
  });
});

describe("item_move_with_check", () => {
  /**
   * Move blocked by hook
   * Given an item with unchecked checkboxes being moved to "done"
   * When item_move_with_check is called
   * Then it throws with message about incomplete checkboxes
   */
  it("blocks move to done when checkboxes incomplete", async () => {
    const item = await item_new(column_src, "阻止移动");
    const content = (await import("node:fs/promises")).readFile(item.file_path, "utf-8");
    await writeFile(item.file_path, (await content) + "- [ ] unfinished\n", "utf-8");
    await expect(
      item_move_with_check(item.file_path, column_dst)
    ).rejects.toThrow("未完成的 checkbox");
  });

  /**
   * Custom hook overrides
   * Given a custom hook script in .hooks/
   * When item_move_with_check is called
   * Then the hook is executed
   */
  it("executes custom hook from .hooks/ directory", async () => {
    const kanban_dir = path.dirname(column_dst);
    const hooks_dir = path.join(kanban_dir, ".hooks");
    await (await import("node:fs/promises")).mkdir(hooks_dir, { recursive: true });
    // hook that always rejects
    await writeFile(
      path.join(hooks_dir, "done.mjs"),
      "export function before_move() { return { ok: false, message: \"hook 拦截\" }; }\n",
      "utf-8"
    );
    const item = await item_new(column_src, "hook测试");
    await expect(
      item_move_with_check(item.file_path, column_dst)
    ).rejects.toThrow("hook 拦截");
  });

  /**
   * All done + no hooks
   * Given an item with all checkboxes done, moving to done
   * When item_move_with_check is called
   * Then move succeeds
   */
  it("allows move when all checkboxes done", async () => {
    const item = await item_new(column_src, "可以移动");
    const content = (await import("node:fs/promises")).readFile(item.file_path, "utf-8");
    await writeFile(item.file_path, (await content) + "- [x] complete\n", "utf-8");
    const result = await item_move_with_check(item.file_path, column_dst);
    expect(result).toBe(path.join(column_dst, "可以移动.md"));
  });
});