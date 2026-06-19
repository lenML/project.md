import { describe, it, expect } from 'vitest';
import {
  parse_yaml_frontmatter,
  build_frontmatter_doc,
  parse_checkbox_lines,
  toggle_checkbox_by_hash,
} from '../../src/utils/markdown.js';

const sample_doc_with_metadata = `---
id: abc12345
name: test task
created_at: "2024-01-01T10:00:00Z"
---

some content
- [ ] todo 1
- [x] done
`;

describe('parse_yaml_frontmatter', () => {
  /**
   * Parses yaml frontmatter and body
   * Given a markdown doc with frontmatter
   * When parse_yaml_frontmatter is called
   * Then returns metadata and body
   */
  it('parses yaml frontmatter and body', () => {
    const result = parse_yaml_frontmatter(sample_doc_with_metadata);
    expect(result).not.toBeNull();
    expect(result!.metadata).toEqual({
      id: 'abc12345',
      name: 'test task',
      created_at: '2024-01-01T10:00:00Z',
    });
    expect(result!.body).toContain('some content');
  });

  /**
   * Returns null for doc without frontmatter
   * Given a doc without frontmatter
   * When parse_yaml_frontmatter is called
   * Then returns null
   */
  it('returns null for doc without frontmatter', () => {
    expect(parse_yaml_frontmatter('just content')).toBeNull();
  });

  /**
   * Handles empty body
   * Given a doc with frontmatter but empty body
   * When parse_yaml_frontmatter is called
   * Then returns metadata with empty body
   */
  it('handles empty body', () => {
    const result = parse_yaml_frontmatter('---\nkey: val\n---');
    expect(result!.metadata).toEqual({ key: 'val' });
    expect(result!.body.trim()).toBe('');
  });
});

describe('build_frontmatter_doc', () => {
  /**
   * Builds a document with frontmatter
   * Given metadata and body text
   * When build_frontmatter_doc is called
   * Then returns properly formatted markdown
   */
  it('builds a document with frontmatter', () => {
    const doc = build_frontmatter_doc({ name: 'task' }, 'body text');
    expect(doc).toMatch(/^---\nname: task\n---\n\nbody text\n?$/);
  });
});

const sample_with_todos = `# header

- [ ] first todo
- [x] second done
- [ ] third todo
`;

describe('parse_checkbox_lines', () => {
  /**
   * Parses all checkbox lines
   * Given markdown with 3 checkboxes
   * When parse_checkbox_lines is called
   * Then returns 3 items with correct checked state and text
   */
  it('parses all checkbox lines with text, checked, hash', () => {
    const items = parse_checkbox_lines(sample_with_todos);
    expect(items).toHaveLength(3);
    expect(items[0].checked).toBe(false);
    expect(items[0].text).toBe('first todo');
    expect(items[1].checked).toBe(true);
    expect(items[1].text).toBe('second done');
    expect(items[2].checked).toBe(false);
    expect(items[2].text).toBe('third todo');
  });

  /**
   * Generates deterministic hash
   * Given markdown with checkboxes
   * When parsed twice with same text
   * Then hash is same
   */
  it('generates deterministic hash', () => {
    const items = parse_checkbox_lines(sample_with_todos);
    expect(items[0].hash).toMatch(/^[0-9a-f]{8}$/);
    const solo = parse_checkbox_lines('- [ ] first todo');
    expect(items[0].hash).toBe(solo[0].hash);
  });

  /**
   * Provides bracket_offset
   * Given markdown with checkboxes
   * When parse_checkbox_lines is called
   * Then bracket_offset points to "[ ]" in source
   */
  it('provides bracket_offset for exact source position', () => {
    const items = parse_checkbox_lines(sample_with_todos);
    expect(items[0].bracket_offset).toBeGreaterThan(0);
    const slice = sample_with_todos.slice(items[0].bracket_offset, items[0].bracket_offset + 3);
    expect(slice).toBe('[ ]');
  });

  /**
   * Returns empty array for no checkboxes
   * Given plain text without checkboxes
   * When parse_checkbox_lines is called
   * Then returns empty array
   */
  it('returns empty array for no checkboxes', () => {
    expect(parse_checkbox_lines('plain text')).toEqual([]);
  });
});

describe('toggle_checkbox_by_hash', () => {
  /**
   * Toggles unchecked to checked
   * Given a doc with unchecked checkbox
   * When toggle_checkbox_by_hash is called
   * Then checkbox becomes checked
   */
  it('toggles unchecked to checked', () => {
    const hash = parse_checkbox_lines(sample_with_todos)[0].hash;
    const result = toggle_checkbox_by_hash(sample_with_todos, hash);
    expect(result).toContain('- [x] first todo');
    expect(result).toContain('- [x] second done');
    expect(result).toContain('- [ ] third todo');
  });

  /**
   * Toggles checked to unchecked
   * Given a doc with checked checkbox
   * When toggle_checkbox_by_hash is called
   * Then checkbox becomes unchecked
   */
  it('toggles checked to unchecked', () => {
    const hash = parse_checkbox_lines(sample_with_todos)[1].hash;
    const result = toggle_checkbox_by_hash(sample_with_todos, hash);
    expect(result).toContain('- [ ] first todo');
    expect(result).toContain('- [ ] second done');
    expect(result).toContain('- [ ] third todo');
  });

  /**
   * Returns unchanged content for unknown hash
   * Given a doc with checkboxes
   * When toggle_checkbox_by_hash is called with unknown hash
   * Then content stays unchanged
   */
  it('returns unchanged content for unknown hash', () => {
    const result = toggle_checkbox_by_hash(sample_with_todos, 'deadbeef');
    expect(result).toBe(sample_with_todos);
  });
});
