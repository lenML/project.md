import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { project_init } from '../../src/core/project.js';
import { kanban_init } from '../../src/core/kanban.js';
import { column_init } from '../../src/core/column.js';
import { item_new } from '../../src/core/item.js';
import { checkbox_list, checkbox_toggle } from '../../src/core/checkbox.js';
import { try_read_file } from '../../src/utils/fs.js';

let tmp_dir: string;
let column_dir: string;
let item_path: string;

beforeEach(async () => {
  tmp_dir = mkdtempSync(path.join(os.tmpdir(), 'pmd-test-'));
  const proj_dir = await project_init(tmp_dir, 'test-proj');
  const kanban_dir = await kanban_init(proj_dir, 'dev');
  column_dir = await column_init(kanban_dir, 'todo');
  const item = await item_new(column_dir, '任务');
  item_path = item.file_path;
  await writeFile(
    item_path,
    (await try_read_file(item_path)) + '- [ ] a\n- [ ] b\n- [ ] c\n',
    'utf-8',
  );
});

afterEach(async () => {
  await rm(tmp_dir, { recursive: true, force: true });
});

describe('checkbox_list', () => {
  /**
   * Lists all checkboxes
   * Given an item with 3 checkboxes a b c
   * When checkbox_list is called
   * Then returns 3 items with correct text
   */
  it('lists all checkboxes', async () => {
    const items = await checkbox_list(item_path);
    expect(items).toHaveLength(3);
    expect(items[0].text).toBe('a');
    expect(items[1].text).toBe('b');
    expect(items[2].text).toBe('c');
  });
});

describe('checkbox_toggle', () => {
  /**
   * Toggles single checkbox
   * Given an item with checkboxes a b c
   * When checkbox_toggle is called with hash of a
   * Then only a becomes checked
   */
  it('toggles single hash', async () => {
    const before = await checkbox_list(item_path);
    await checkbox_toggle(item_path, before[0].hash);
    const after = await checkbox_list(item_path);
    expect(after[0].checked).toBe(true);
    expect(after[1].checked).toBe(false);
    expect(after[2].checked).toBe(false);
  });

  /**
   * Toggle multiple hashes at once
   * Given an item with checkboxes a b c
   * When checkbox_toggle is called with hashes of a and c
   * Then a and c become checked, b stays unchecked
   */
  it('toggles multiple hashes at once', async () => {
    const before = await checkbox_list(item_path);
    await checkbox_toggle(item_path, before[0].hash, before[2].hash);
    const after = await checkbox_list(item_path);
    expect(after[0].checked).toBe(true);
    expect(after[1].checked).toBe(false);
    expect(after[2].checked).toBe(true);
  });

  /**
   * No-arg toggle does nothing
   * Given an item with checkboxes
   * When checkbox_toggle is called without hashes
   * Then no checkbox changes state
   */
  it('no-arg does nothing', async () => {
    await checkbox_toggle(item_path);
    const after = await checkbox_list(item_path);
    expect(after.every((t) => !t.checked)).toBe(true);
  });
});
