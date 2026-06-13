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
created_at: '2024-01-01T10:00:00Z'
---

some content
- [ ] todo 1
- [x] done
`;

describe('parse_yaml_frontmatter', () => {
  /**
   * Parse valid doc
   * Given a document with yaml frontmatter
   * When parse_yaml_frontmatter is called
   * Then it returns metadata object and body content
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
   * No frontmatter
   * Given a document without '---' delimiters
   * When parse_yaml_frontmatter is called
   * Then it returns null
   */
  it('returns null for doc without frontmatter', () => {
    expect(parse_yaml_frontmatter('just content')).toBeNull();
  });

  /**
   * Empty body
   * Given a document with only frontmatter
   * When parse_yaml_frontmatter is called
   * Then it returns metadata and empty body
   */
  it('handles empty body', () => {
    const result = parse_yaml_frontmatter('---\nkey: val\n---');
    expect(result!.metadata).toEqual({ key: 'val' });
    expect(result!.body.trim()).toBe('');
  });
});

describe('build_frontmatter_doc', () => {
  /**
   * Build doc from metadata
   * Given a metadata object and body string
   * When build_frontmatter_doc is called
   * Then it returns a proper '---' delimited document
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
   * Parse checkbox lines
   * Given a markdown body with unchecked ("- [ ]") and checked ("- [x]") lines
   * When parse_checkbox_lines is called
   * Then it returns objects with text, checked, and hash for each checkbox
   */
  it('parses all checkbox lines', () => {
    const todos = parse_checkbox_lines(sample_with_todos);
    expect(todos).toHaveLength(3);
    expect(todos[0].checked).toBe(false);
    expect(todos[0].text).toBe('first todo');
    expect(todos[1].checked).toBe(true);
    expect(todos[1].text).toBe('second done');
    expect(todos[2].checked).toBe(false);
    expect(todos[2].text).toBe('third todo');
  });

  /**
   * Hash generation
   * Given checkbox text "first todo"
   * When parsed
   * Then hash is deterministic 8-char hex based on text
   */
  it('generates deterministic hash per checkbox text', () => {
    const todos = parse_checkbox_lines(sample_with_todos);
    expect(todos[0].hash).toMatch(/^[0-9a-f]{8}$/);
    // same text yields same hash
    const first_todo_solo = parse_checkbox_lines('- [ ] first todo');
    expect(todos[0].hash).toBe(first_todo_solo[0].hash);
  });

  /**
   * No checkboxes
   * Given content with no "- [ ]" or "- [x]" lines
   * When parse_checkbox_lines is called
   * Then it returns empty array
   */
  it('returns empty array for no checkboxes', () => {
    expect(parse_checkbox_lines('plain text')).toEqual([]);
  });
});

describe('toggle_checkbox_by_hash', () => {
  /**
   * Toggle unchecked to checked
   * Given content with "- [ ] first todo" and hash of that checkbox
   * When toggle_checkbox_by_hash is called
   * Then "- [ ]" becomes "- [x]"
   */
  it('toggles unchecked to checked', () => {
    const result = toggle_checkbox_by_hash(sample_with_todos, parse_checkbox_lines(sample_with_todos)[0].hash);
    expect(result).toContain('- [x] first todo');
    expect(result).toContain('- [x] second done');
    expect(result).toContain('- [ ] third todo');
  });

  /**
   * Toggle checked to unchecked
   * Given content with "- [x] second done" and hash of that checkbox
   * When toggle_checkbox_by_hash is called
   * Then "- [x]" becomes "- [ ]"
   */
  it('toggles checked to unchecked', () => {
    const todos = parse_checkbox_lines(sample_with_todos);
    const result = toggle_checkbox_by_hash(sample_with_todos, todos[1].hash);
    expect(result).toContain('- [ ] first todo');
    expect(result).toContain('- [ ] second done');
    expect(result).toContain('- [ ] third todo');
  });

  /**
   * Unknown hash
   * Given a hash that doesn't match any checkbox
   * When toggle_checkbox_by_hash is called
   * Then content is returned unchanged
   */
  it('returns unchanged content for unknown hash', () => {
    const result = toggle_checkbox_by_hash(sample_with_todos, 'deadbeef');
    expect(result).toBe(sample_with_todos);
  });
});
