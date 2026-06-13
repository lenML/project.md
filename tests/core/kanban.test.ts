import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { project_init } from '../../src/core/project.js';
import { kanban_init, kanban_list, kanban_remove } from '../../src/core/kanban.js';
import { path_exists, list_dir } from '../../src/utils/fs.js';

let tmp_dir: string;
let proj_dir: string;

beforeEach(async () => {
  tmp_dir = mkdtempSync(path.join(os.tmpdir(), 'pdm-test-'));
  proj_dir = await project_init(tmp_dir, 'test-proj');
});

afterEach(async () => {
  await rm(tmp_dir, { recursive: true, force: true });
});

describe('kanban_init', () => {
  /**
   * Init kanban
   * Given a project directory and kanban name "dev"
   * When kanban_init is called
   * Then the kanban directory is created under the project
   */
  it('creates kanban directory', async () => {
    const k_dir = await kanban_init(proj_dir, 'dev');
    expect(k_dir).toBe(path.join(proj_dir, 'dev'));
    expect(path_exists(k_dir)).toBe(true);
  });

  /**
   * Idempotent
   * Given an existing kanban
   * When kanban_init is called again
   * Then it does not throw
   */
  it('is idempotent for existing kanban', async () => {
    await kanban_init(proj_dir, 'dev');
    await expect(kanban_init(proj_dir, 'dev')).resolves.toBe(path.join(proj_dir, 'dev'));
  });
});

describe('kanban_list', () => {
  /**
   * List kanbans
   * Given a project with "dev" and "docs" kanbans
   * When kanban_list is called
   * Then both kanban names are returned
   */
  it('lists all kanbans in project', async () => {
    await kanban_init(proj_dir, 'dev');
    await kanban_init(proj_dir, 'docs');
    const list = await kanban_list(proj_dir);
    expect(list).toEqual(['dev', 'docs']);
  });

  /**
   * Empty project
   * Given a project with no kanbans
   * When kanban_list is called
   * Then empty array is returned
   */
  it('returns empty array for empty project', async () => {
    expect(await kanban_list(proj_dir)).toEqual([]);
  });
});

describe('kanban_remove', () => {
  /**
   * Remove kanban
   * Given a project with "temp" kanban containing an item
   * When kanban_remove is called
   * Then kanban directory is removed
   */
  it('removes kanban directory', async () => {
    const k_dir = await kanban_init(proj_dir, 'temp');
    await kanban_remove(proj_dir, 'temp');
    expect(path_exists(k_dir)).toBe(false);
  });
});
