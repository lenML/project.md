import yaml from 'js-yaml';

const FM_DELIM = '---';

export interface ParseResult {
  metadata: Record<string, unknown>;
  body: string;
}

export function parseFrontmatter(content: string): ParseResult | null {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith(FM_DELIM)) return null;
  const endIdx = trimmed.indexOf('\n' + FM_DELIM, 3);
  if (endIdx === -1) return null;
  const yamlText = trimmed.slice(3, endIdx);
  const body = trimmed.slice(endIdx + 4).trimStart();
  try {
    const metadata = yaml.load(yamlText) as Record<string, unknown>;
    return { metadata, body };
  } catch {
    return null;
  }
}

function shortHash(text: string): string {
  const data = new TextEncoder().encode(text);
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data[i];
    hash |= 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 8);
}

export interface CheckboxItem {
  text: string;
  checked: boolean;
  hash: string;
  depth: number;
}

/**
 * 在 markdown 正文中切换指定 hash 的 checkbox 状态。
 * 返回切换后的内容，若 hash 未找到返回 null。
 * 父级 toggle 时联动子级。
 */
export function toggleCheckboxByHash(content: string, hash: string): string | null {
  const lines = content.split('\n');
  let target_idx = -1;
  let target_checked = false;
  let target_depth = 0;

  // 找 hash 匹配的行
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\s*)[-*]\s\[( |x|X)\]\s(.+)$/);
    if (m) {
      const text = m[3].trim();
      const depth = Math.floor(m[1].length / 2);
      if (shortHash(text) === hash) {
        target_idx = i;
        target_checked = m[2] === 'x' || m[2] === 'X';
        target_depth = depth;
        break;
      }
    }
  }
  if (target_idx === -1) return null;

  const newState = target_checked ? ' ' : 'x';

  // 切换父级
  lines[target_idx] = lines[target_idx].replace(/\[( |x|X)\]/, `[${newState}]`);

  // 联动子级（缩进更大的行跟随父级状态）
  for (let i = target_idx + 1; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\s*)[-*]\s\[( |x|X)\]\s(.+)$/);
    if (m) {
      const depth = Math.floor(m[1].length / 2);
      if (depth > target_depth) {
        lines[i] = line.replace(/\[( |x|X)\]/, `[${newState}]`);
      } else {
        break; // 回到同级或更高级，停止
      }
    }
  }

  return lines.join('\n');
}

export function buildFrontmatterDoc(metadata: Record<string, unknown>, body: string): string {
  const yamlText = yaml
    .dump(metadata, { lineWidth: -1, quotingType: "'" } as Record<string, unknown>)
    .trimEnd();
  return FM_DELIM + '\n' + yamlText + '\n' + FM_DELIM + '\n\n' + body + '\n';
}

export function parseCheckboxes(content: string): CheckboxItem[] {
  const items: CheckboxItem[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const m = line.match(/^(\s*)[-*]\s\[( |x|X)\]\s(.+)$/);
    if (m) {
      const text = m[3].trim();
      const depth = Math.floor(m[1].length / 2);
      items.push({ text, checked: m[2] === 'x' || m[2] === 'X', hash: shortHash(text), depth });
    }
  }
  return items;
}
