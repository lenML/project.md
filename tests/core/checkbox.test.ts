import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { project_init } from "../../src/core/project.js";
import { kanban_init } from "../../src/core/kanban.js";
import { column_init } from "../../src/core/column.js";
import { item_new } from "../../src/core/item.js";
import { checkbox_list, checkbox_toggle } from "../../src/core/checkbox.js";
import { try_read_file } from "../../src/utils/fs.js";

let tmp_dir: string;
let column_dir: string;
let item_path: string;

beforeEach(async () => {
  tmp_dir = mkdtempSync(path.join(os.tmpdir(), "pdm-test-"));
  const proj_dir = await project_init(tmp_dir, "test-proj");
  const kanban_dir = await kanban_init(proj_dir, "dev");
  column_dir = await column_init(kanban_dir, "todo");
  const item = await item_new(column_dir, "任务");
  item_path = item.file_path;
  await writeFile(item_path, (await try_read_file(item_path)) + "- [ ] first\n- [ ] second\n", "utf-8");
});

afterEach(async () => {
  await rm(tmp_dir, { recursive: true, force: true });
});

describe("checkbox_list", () => {
  /**
   * List checkboxes from item
   * Given an item with two unchecked checkboxes
   * When checkbox_list is called
   * Then it returns both with unchecked status
   */
  it("lists all checkboxes in item", async () => {
    const items = await checkbox_list(item_path);
    expect(items).toHaveLength(2);
    expect(items[0].text).toBe("first");
    expect(items[0].checked).toBe(false);
    expect(items[1].text).toBe("second");
    expect(items[1].checked).toBe(false);
  });
});

describe("checkbox_toggle", () => {
  /**
   * Toggle unchecked to checked
   * Given an unchecked checkbox "first"
   * When checkbox_toggle is called with its hash
   * Then it becomes checked in the file
   */
  it("toggles unchecked checkbox to checked", async () => {
    const before = await checkbox_list(item_path);
    const hash = before[0].hash;
    await checkbox_toggle(item_path, hash);
    const after = await checkbox_list(item_path);
    expect(after[0].checked).toBe(true);
    expect(after[1].checked).toBe(false);
  });

  /**
   * Toggle checked to unchecked
   * Given a checked checkbox
   * When checkbox_toggle is called again
   * Then it becomes unchecked
   */
  it("toggles checked checkbox to unchecked", async () => {
    const before = await checkbox_list(item_path);
    const hash = before[0].hash;
    await checkbox_toggle(item_path, hash);
    await checkbox_toggle(item_path, hash);
    const after = await checkbox_list(item_path);
    expect(after[0].checked).toBe(false);
  });
});