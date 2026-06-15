import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { project_init } from '../../src/core/project.js';
import { kanban_init } from '../../src/core/kanban.js';
import { column_init } from '../../src/core/column.js';
import {
  item_import,
  item_list,
  item_show,
  type ItemSummary,
} from '../../src/core/item.js';
import { path_exists, try_read_file } from '../../src/utils/fs.js';

let tmp_dir: string;
let column_dir: string;

beforeEach(async () => {
  tmp_dir = mkdtempSync(path.join(os.tmpdir(), 'pmd-test-'));
  const proj_dir = await project_init(tmp_dir, 'test-proj');
  const kanban_dir = await kanban_init(proj_dir, 'dev');
  column_dir = await column_init(kanban_dir, 'todo');
});

afterEach(async () => {
  await rm(tmp_dir, { recursive: true, force: true });
});

describe('item_import', () => {
  /**
   * Import markdown without frontmatter
   * Given a plain .md file without frontmatter
   * When item_import is called
   * Then it creates a card with auto-generated frontmatter (id, name, created_at)
   */
  it('imports plain md file', async () => {
    const src = path.join(tmp_dir, 'source.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(src, '# My Task\n\n- [ ] subtask');
    const result = await item_import(column_dir, src);
    expect(result.id).toMatch(/^[0-9a-f]{8}$/);
    expect(result.name).toBe('source');
    expect(path_exists(result.file_path)).toBe(true);
    const content = await try_read_file(result.file_path);
    expect(content).toContain('id: ' + result.id);
    expect(content).toContain('name: source');
    expect(content).toContain('# My Task');
    expect(content).toContain('- [ ] subtask');
  });

  /**
   * Import markdown WITH frontmatter
   * Given a .md file with existing frontmatter
   * When item_import is called
   * Then it merges frontmatter (keeps original name/desc, adds id/created_at)
   */
  it('imports md file with frontmatter', async () => {
    const src = path.join(tmp_dir, 'existing.md');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(src, '---\nname: custom-name\ndesc: custom desc\npriority: high\n---\n\nBody content');
    const result = await item_import(column_dir, src);
    expect(result.name).toBe('custom-name');
    expect(path_exists(result.file_path)).toBe(true);
    const content = await try_read_file(result.file_path);
    expect(content).toContain('name: custom-name');
    expect(content).toContain('desc: custom desc');
    expect(content).toContain('priority: high');
    expect(content).toContain('Body content');
  });

  /**
   * Import throws on missing file
   * Given a non-existent source path
   * When item_import is called
   * Then it throws
   */
  it('throws on missing file', async () => {
    await expect(item_import(column_dir, path.join(tmp_dir, 'nope.md')))
      .rejects.toThrow('file not found');
  });
});
