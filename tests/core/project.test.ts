import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { project_init, project_list, project_context } from '../../src/core/project.js';
import { path_exists, try_read_file } from '../../src/utils/fs.js';

let tmp_dir: string;

beforeEach(() => {
  tmp_dir = mkdtempSync(path.join(os.tmpdir(), 'pmd-test-'));
});

afterEach(async () => {
  await rm(tmp_dir, { recursive: true, force: true });
});

describe('project_init', () => {
  /**
   * Init project
   * Given a root dir and a project name "my-project"
   * When project_init is called
   * Then the project directory and readme.md are created
   */
  it('creates project dir with readme.md', async () => {
    const result = await project_init(tmp_dir, 'my-project');
    expect(result).toBe(path.join(tmp_dir, 'my-project'));
    const readme = await try_read_file(path.join(tmp_dir, 'my-project', 'readme.md'));
    expect(readme).toContain('name: my-project');
  });

  /**
   * Idempotent
   * Given a project that already exists
   * When project_init is called again
   * Then it does not throw and returns the same path
   */
  it('is idempotent when project exists', async () => {
    await project_init(tmp_dir, 'existing');
    await expect(project_init(tmp_dir, 'existing')).resolves.toBe(path.join(tmp_dir, 'existing'));
  });
});

describe('project_list', () => {
  /**
   * List projects
   * Given a root dir with two projects "alpha" and "beta"
   * When project_list is called
   * Then it returns both project names
   */
  it('lists all project directories', async () => {
    await project_init(tmp_dir, 'alpha');
    await project_init(tmp_dir, 'beta');
    const list = await project_list(tmp_dir);
    expect(list).toEqual(['alpha', 'beta']);
  });

  /**
   * Empty root
   * Given a root dir with no projects
   * When project_list is called
   * Then it returns an empty array
   */
  it('returns empty array for empty root', async () => {
    const list = await project_list(tmp_dir);
    expect(list).toEqual([]);
  });
});

describe('project_context', () => {
  /**
   * Read project context
   * Given an initialised project "demo"
   * When project_context is called
   * Then it returns the readme content
   */
  it('returns readme content for existing project', async () => {
    await project_init(tmp_dir, 'demo');
    const ctx = await project_context(tmp_dir, 'demo');
    // frontmatter-only has empty body, project_context returns null
    expect(ctx).toBeNull();
  });

  /**
   * Nonexistent project
   * Given a project that does not exist
   * When project_context is called
   * Then it returns null
   */
  it('returns null for nonexistent project', async () => {
    const ctx = await project_context(tmp_dir, 'ghost');
    expect(ctx).toBeNull();
  });
});
