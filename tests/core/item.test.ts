import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { project_init } from '../../src/core/project.js';
import { kanban_init } from '../../src/core/kanban.js';
import { column_init } from '../../src/core/column.js';
import {
  item_new,
  item_list,
  item_show,
  item_move,
  item_remove,
  type ItemSummary,
} from '../../src/core/item.js';
import { path_exists, try_read_file } from '../../src/utils/fs.js';

let tmp_dir: string;
let column_dir: string;

beforeEach(async () => {
  tmp_dir = mkdtempSync(path.join(os.tmpdir(), 'pdm-test-'));
  const proj_dir = await project_init(tmp_dir, 'test-proj');
  const kanban_dir = await kanban_init(proj_dir, 'dev');
  column_dir = await column_init(kanban_dir, 'todo');
});

afterEach(async () => {
  await rm(tmp_dir, { recursive: true, force: true });
});

describe('item_new', () => {
  /**
   * Create item
   * Given a column directory, name "登录模块", and optional desc
   * When item_new is called
   * Then a .md file is created with yaml frontmatter (id, name, created_at) and desc in body
   */
  it('creates item file with frontmatter', async () => {
    const result = await item_new(column_dir, '登录模块', '用户登录功能');
    expect(result.file_path).toBe(path.join(column_dir, '登录模块.md'));
    expect(path_exists(result.file_path)).toBe(true);
    expect(result.id).toMatch(/^[0-9a-f]{8}$/);
    const content = await try_read_file(result.file_path);
    expect(content).toContain('name: 登录模块');
    expect(content).toContain('id: ' + result.id);
    expect(content).toContain('created_at:');
    expect(content).toContain('用户登录功能');
  });

  /**
   * No desc
   * Given column dir and name only
   * When item_new is called without desc
   * Then body is empty (no extra content)
   */
  it('creates item without desc', async () => {
    const result = await item_new(column_dir, 'simple-task');
    const content = await try_read_file(result.file_path);
    expect(content).not.toContain('desc:');
  });
});

describe('item_list', () => {
  /**
   * List items in column
   * Given a column with two items
   * When item_list is called with column_dir
   * Then both items are returned with name, id, file_path
   */
  it('lists items in a column', async () => {
    const a = await item_new(column_dir, 'task-a');
    const b = await item_new(column_dir, 'task-b');
    const list = await item_list(column_dir);
    expect(list).toHaveLength(2);
    const names = list.map(i => i.name).sort();
    expect(names).toEqual(['task-a', 'task-b']);
  });

  /**
   * Empty column
   * Given a column with no items
   * When item_list is called
   * Then empty array is returned
   */
  it('returns empty array for empty column', async () => {
    expect(await item_list(column_dir)).toEqual([]);
  });
});

describe('item_show', () => {
  /**
   * Show item detail
   * Given an item with todos in body
   * When item_show is called
   * Then it returns frontmatter, body, and parsed todos
   */
  it('returns item detail with todos', async () => {
    const created = await item_new(column_dir, '带有待办', '需要完成');
    // 追加 todos 到文件
    const content = (await try_read_file(created.file_path))!;
    const { writeFile } = await import('node:fs/promises');
    await writeFile(created.file_path, content + '- [ ] first\n- [x] done\n');

    const detail = await item_show(created.file_path);
    expect(detail).not.toBeNull();
    expect(detail!.metadata.name).toBe('带有待办');
    expect(detail!.todos).toHaveLength(2);
    expect(detail!.todos[0].text).toBe('first');
    expect(detail!.todos[0].checked).toBe(false);
    expect(detail!.todos[1].text).toBe('done');
    expect(detail!.todos[1].checked).toBe(true);
  });
});

describe('item_move', () => {
  /**
   * Move item to another column
   * Given an item in column "todo"
   * When item_move moves it to column "done"
   * Then file is at new path and no longer at original
   */
  it('moves item file to destination column', async () => {
    const done_dir = await column_init(path.dirname(column_dir), 'done');
    const item = await item_new(column_dir, 'movable');
    const dest = await item_move(item.file_path, done_dir);
    expect(path_exists(dest)).toBe(true);
    expect(path_exists(item.file_path)).toBe(false);
    expect(dest).toBe(path.join(done_dir, 'movable.md'));
  });
});

describe('item_remove', () => {
  /**
   * Remove item
   * Given an existing item
   * When item_remove is called
   * Then file is deleted
   */
  it('deletes item file', async () => {
    const item = await item_new(column_dir, 'remove-me');
    await item_remove(item.file_path);
    expect(path_exists(item.file_path)).toBe(false);
  });
});
