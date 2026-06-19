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

  it('returns null for doc without frontmatter', () => {
    expect(parse_yaml_frontmatter('just content')).toBeNull();
  });

  it('handles empty body', () => {
    const result = parse_yaml_frontmatter('---\nkey: val\n---');
    expect(result!.metadata).toEqual({ key: 'val' });
    expect(result!.body.trim()).toBe('');
  });
});

describe('build_frontmatter_doc', () => {
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

  it('generates deterministic hash', () => {
    const items = parse_checkbox_lines(sample_with_todos);
    expect(items[0].hash).toMatch(/^[0-9a-f]{8}$/);
    const solo = parse_checkbox_lines('- [ ] first todo');
    expect(items[0].hash).toBe(solo[0].hash);
  });

  it('provides bracket_offset for exact source position', () => {
    const items = parse_checkbox_lines(sample_with_todos);
    expect(items[0].bracket_offset).toBeGreaterThan(0);
    const slice = sample_with_todos.slice(items[0].bracket_offset, items[0].bracket_offset + 3);
    expect(slice).toBe('[ ]');
  });

  it('returns empty array for no checkboxes', () => {
    expect(parse_checkbox_lines('plain text')).toEqual([]);
  });
});

describe('toggle_checkbox_by_hash', () => {
  it('toggles unchecked to checked', () => {
    const hash = parse_checkbox_lines(sample_with_todos)[0].hash;
    const result = toggle_checkbox_by_hash(sample_with_todos, hash);
    expect(result).toContain('- [x] first todo');
    expect(result).toContain('- [x] second done');
    expect(result).toContain('- [ ] third todo');
  });

  it('toggles checked to unchecked', () => {
    const hash = parse_checkbox_lines(sample_with_todos)[1].hash;
    const result = toggle_checkbox_by_hash(sample_with_todos, hash);
    expect(result).toContain('- [ ] first todo');
    expect(result).toContain('- [ ] second done');
    expect(result).toContain('- [ ] third todo');
  });

  it('returns unchanged content for unknown hash', () => {
    const result = toggle_checkbox_by_hash(sample_with_todos, 'deadbeef');
    expect(result).toBe(sample_with_todos);
  });
});
