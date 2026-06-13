import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { project_init } from '../../src/core/project.js';
import { kanban_init } from '../../src/core/kanban.js';
import { column_init, column_list } from '../../src/core/column.js';
import { path_exists } from '../../src/utils/fs.js';

let tmp_dir: string;
let kanban_dir: string;

beforeEach(async () => {
  tmp_dir = mkdtempSync(path.join(os.tmpdir(), 'pdm-test-'));
  const proj_dir = await project_init(tmp_dir, 'test-proj');
  kanban_dir = await kanban_init(proj_dir, 'dev');
});

afterEach(async () => {
  await rm(tmp_dir, { recursive: true, force: true });
});

describe('column_init', () => {
  /**
   * Init column
   * Given a kanban directory and column name "todo"
   * When column_init is called
   * Then the column directory is created
   */
  it('creates column directory under kanban', async () => {
    const col_dir = await column_init(kanban_dir, 'todo');
    expect(col_dir).toBe(path.join(kanban_dir, 'todo'));
    expect(path_exists(col_dir)).toBe(true);
  });

  /**
   * Idempotent
   * Given an existing column
   * When column_init is called again
   * Then it does not throw
   */
  it('is idempotent', async () => {
    await column_init(kanban_dir, 'todo');
    await expect(column_init(kanban_dir, 'todo')).resolves.toBe(path.join(kanban_dir, 'todo'));
  });
});

describe('column_list', () => {
  /**
   * List columns
   * Given a kanban with "todo" and "done" columns
   * When column_list is called
   * Then both column names are returned
   */
  it('lists all columns in kanban', async () => {
    await column_init(kanban_dir, 'todo');
    await column_init(kanban_dir, 'done');
    const list = await column_list(kanban_dir);
    expect(list).toEqual(['done', 'todo']);
  });

  /**
   * Empty kanban
   * Given a kanban with no columns
   * When column_list is called
   * Then empty array is returned
   */
  it('returns empty array for empty kanban', async () => {
    expect(await column_list(kanban_dir)).toEqual([]);
  });
});
