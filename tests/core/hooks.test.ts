import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, existsSync } from 'node:fs';
import { rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { project_init } from '../../src/core/project.js';
import { kanban_init } from '../../src/core/kanban.js';
import { column_init } from '../../src/core/column.js';
import {
  load_hooks,
  run_before_hook,
  run_after_hook,
  get_kanban_dir,
  type HookContext,
} from '../../src/core/hooks.js';
import { item_new, item_remove } from '../../src/core/item.js';
import { checkbox_list, checkbox_toggle } from '../../src/core/checkbox.js';
import { try_read_file } from '../../src/utils/fs.js';

let tmp_dir: string;
let kanban_dir: string;
let col_todo: string;
let col_done: string;

beforeEach(async () => {
  tmp_dir = mkdtempSync(path.join(os.tmpdir(), 'pmd-test-'));
  const proj_dir = await project_init(tmp_dir, 'test-proj');
  kanban_dir = await kanban_init(proj_dir, 'dev');
  col_todo = await column_init(kanban_dir, 'todo');
  col_done = await column_init(kanban_dir, 'done');
});

afterEach(async () => {
  await rm(tmp_dir, { recursive: true, force: true });
});

describe('load_hooks', () => {
  /**
   * Returns empty for kanban without hooks
   * Given a kanban dir without .hooks
   * When load_hooks is called
   * Then returns empty object
   */
  it('returns empty for kanban without hooks', async () => {
    const hooks = await load_hooks(kanban_dir);
    expect(Object.keys(hooks)).toHaveLength(0);
  });

  /**
   * Loads hooks from index.mjs
   * Given a kanban with .hooks/index.mjs
   * When load_hooks is called
   * Then returns an object containing before_item_move function
   */
  it('loads hooks from index.mjs', async () => {
    const hooks_dir = path.join(kanban_dir, '.hooks');
    await mkdir(hooks_dir, { recursive: true });
    await writeFile(
      path.join(hooks_dir, 'index.mjs'),
      'export function before_item_move(ctx) { return { ok: false, message: "blocked" }; }\n',
      'utf-8',
    );
    const hooks = await load_hooks(kanban_dir);
    expect(typeof hooks.before_item_move).toBe('function');
  });
});

describe('run_before_hook', () => {
  /**
   * Runs before_item_move from index.mjs
   * Given a kanban with .hooks/index.mjs that denies move
   * When run_before_hook is called for before_item_move
   * Then returns blocked result with message containing dest column
   */
  it('runs before_item_move from index.mjs', async () => {
    const hooks_dir = path.join(kanban_dir, '.hooks');
    await mkdir(hooks_dir, { recursive: true });
    await writeFile(
      path.join(hooks_dir, 'index.mjs'),
      'export function before_item_move(ctx) { return { ok: false, message: "denied: " + ctx.dest_column }; }\n',
      'utf-8',
    );
    const result = await run_before_hook(kanban_dir, 'before_item_move', {
      item_path: '/x.md',
      dest_column: 'done',
    });
    expect(result).not.toBeNull();
    expect(result!.ok).toBe(false);
    expect(result!.message).toContain('denied');
    expect(result!.message).toContain('done');
  });

  /**
   * Returns null when hook allows
   * Given a kanban with .hooks/index.mjs that allows move
   * When run_before_hook is called
   * Then returns null
   */
  it('returns null when hook allows', async () => {
    const hooks_dir = path.join(kanban_dir, '.hooks');
    await mkdir(hooks_dir, { recursive: true });
    await writeFile(
      path.join(hooks_dir, 'index.mjs'),
      'export function before_item_move() { return { ok: true }; }\n',
      'utf-8',
    );
    const result = await run_before_hook(kanban_dir, 'before_item_move', {
      item_path: '/x.md',
    });
    expect(result).toBeNull();
  });

  /**
   * Falls back to column-level .mjs
   * Given a kanban with .hooks/todo.mjs
   * When run_before_hook is called with dest_column=todo
   * Then column-level hook runs
   */
  it('falls back to column-level .mjs for before_item_move', async () => {
    const hooks_dir = path.join(kanban_dir, '.hooks');
    await mkdir(hooks_dir, { recursive: true });
    await writeFile(
      path.join(hooks_dir, 'todo.mjs'),
      'export function before_move(ctx) { return { ok: false, message: "col hook: " + ctx.dest_column }; }\n',
      'utf-8',
    );
    const result = await run_before_hook(kanban_dir, 'before_item_move', {
      item_path: '/x.md',
      dest_column: 'todo',
    });
    expect(result).not.toBeNull();
    expect(result!.message).toContain('col hook');
  });

  /**
   * index.mjs takes priority over column-level hook
   * Given both .hooks/index.mjs and .hooks/todo.mjs
   * When run_before_hook is called
   * Then index.mjs result is returned
   */
  it('index.mjs takes priority over column-level hook', async () => {
    const hooks_dir = path.join(kanban_dir, '.hooks');
    await mkdir(hooks_dir, { recursive: true });
    await writeFile(
      path.join(hooks_dir, 'index.mjs'),
      'export function before_item_move() { return { ok: false, message: "from index" }; }\n',
      'utf-8',
    );
    await writeFile(
      path.join(hooks_dir, 'todo.mjs'),
      'export function before_move() { return { ok: false, message: "from col" }; }\n',
      'utf-8',
    );
    const result = await run_before_hook(kanban_dir, 'before_item_move', {
      dest_column: 'todo',
    });
    expect(result!.message).toBe('from index');
  });
});

describe('hooks integrate with item ops', () => {
  /**
   * before_item_create can block item_new
   * Given a kanban with .hooks that blocks item_create
   * When item_new is called
   * Then it rejects with error message
   */
  it('before_item_create can block item_new', async () => {
    const hooks_dir = path.join(kanban_dir, '.hooks');
    await mkdir(hooks_dir, { recursive: true });
    await writeFile(
      path.join(hooks_dir, 'index.mjs'),
      'export function before_item_create() { return { ok: false, message: "no create allowed" }; }\n',
      'utf-8',
    );
    await expect(item_new(col_todo, 'blocked')).rejects.toThrow('no create allowed');
  });

  /**
   * before_item_delete can block item_remove
   * Given a kanban with .hooks that blocks item_delete
   * When item_remove is called
   * Then it rejects with error message
   */
  it('before_item_delete can block item_remove', async () => {
    const item = await item_new(col_todo, 'protected');
    const hooks_dir = path.join(kanban_dir, '.hooks');
    await mkdir(hooks_dir, { recursive: true });
    await writeFile(
      path.join(hooks_dir, 'index.mjs'),
      'export function before_item_delete() { return { ok: false, message: "no delete" }; }\n',
      'utf-8',
    );
    await expect(item_remove(item.file_path)).rejects.toThrow('no delete');
  });

  /**
   * before_checkbox_toggle blocks toggle
   * Given a kanban with .hooks that blocks checkbox_toggle
   * When checkbox_toggle is called
   * Then it rejects with error message
   */
  it('before_checkbox_toggle blocks toggle (single or multi)', async () => {
    const item = await item_new(col_todo, 'locked');
    const content = (await try_read_file(item.file_path))!;
    await writeFile(item.file_path, content + '- [ ] x\n- [ ] y\n', 'utf-8');
    const hooks_dir = path.join(kanban_dir, '.hooks');
    await mkdir(hooks_dir, { recursive: true });
    await writeFile(
      path.join(hooks_dir, 'index.mjs'),
      'export function before_checkbox_toggle() { return { ok: false, message: "no toggle" }; }\n',
      'utf-8',
    );
    const items = await checkbox_list(item.file_path);
    await expect(checkbox_toggle(item.file_path, items[0].hash, items[1].hash)).rejects.toThrow(
      'no toggle',
    );
  });
});
