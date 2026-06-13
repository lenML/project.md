import yaml from 'js-yaml';
import { short_hash } from './hash.js';

const FM_DELIM = '---';

export interface FrontmatterResult {
  metadata: Record<string, unknown>;
  body: string;
}

/**
 * 解析 yaml frontmatter + markdown body。
 */
export function parse_yaml_frontmatter(content: string): FrontmatterResult | null {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith(FM_DELIM)) return null;

  const end_idx = trimmed.indexOf('\n' + FM_DELIM, 3);
  if (end_idx === -1) return null;

  const yaml_text = trimmed.slice(3, end_idx);
  const body = trimmed.slice(end_idx + 4).trimStart();

  const metadata = yaml.load(yaml_text) as Record<string, unknown>;
  return { metadata, body };
}

/**
 * 根据 metadata 和 body 构建含 frontmatter 的文档字符串。
 */
export function build_frontmatter_doc(
  metadata: Record<string, unknown>,
  body: string,
): string {
  const yaml_opts: Record<string, unknown> = { lineWidth: -1, quotingType: "'" };
  const yaml_text = yaml.dump(metadata, yaml_opts as Record<string, unknown>).trimEnd();
  return `${FM_DELIM}\n${yaml_text}\n${FM_DELIM}\n\n${body}\n`;
}

export interface CheckboxItem {
  text: string;
  checked: boolean;
  hash: string;
  line_index: number;
}

const CHECKBOX_RE = /^(- \[([ xX])\] (.+))/;

/**
 * 解析 markdown 中所有 checkbox 行。
 */
export function parse_checkbox_lines(content: string): CheckboxItem[] {
  const lines = content.split('\n');
  const results: CheckboxItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(CHECKBOX_RE);
    if (m) {
      results.push({
        text: m[3],
        checked: m[2].toLowerCase() === 'x',
        hash: short_hash(m[3]),
        line_index: i,
      });
    }
  }
  return results;
}

/**
 * 根据 hash 切换 checkbox 状态。无匹配则返回原内容。
 */
export function toggle_checkbox_by_hash(content: string, hash: string): string {
  const todos = parse_checkbox_lines(content);
  const target = todos.find(t => t.hash === hash);
  if (!target) return content;

  const lines = content.split('\n');
  const line = lines[target.line_index];
  if (target.checked) {
    lines[target.line_index] = line.replace('- [x]', '- [ ]').replace('- [X]', '- [ ]');
  } else {
    lines[target.line_index] = line.replace('- [ ]', '- [x]');
  }
  return lines.join('\n');
}
