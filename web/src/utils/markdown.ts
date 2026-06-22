import yaml from "js-yaml";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Content, ListItem, Paragraph, Root, Text } from "mdast";

const FM_DELIM = "---";

export interface ParseResult {
  metadata: Record<string, unknown>;
  body: string;
}

export function parseFrontmatter(content: string): ParseResult | null {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith(FM_DELIM)) return null;
  const endIdx = trimmed.indexOf("\n" + FM_DELIM, 3);
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
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 8);
}

export interface CheckboxItem {
  text: string;
  checked: boolean;
  hash: string;
  /** 字符偏移位置，用于原地替换 */
  bracketOffset: number;
  depth: number;
}

function getListItemText(node: ListItem): string {
  if (!node.children?.length) return "";
  const first = node.children[0];
  if (first.type !== "paragraph") return "";
  return (first as Paragraph).children
    .filter((c): c is Text => c.type === "text")
    .map((c) => c.value)
    .join("")
    .trim();
}

const CHECKBOX_MARKER = /\[( |x|X)\]/;

function collectCheckboxes(
  node: Content | Root,
  content: string,
  depth = 0,
): CheckboxItem[] {
  if (node.type !== "list" && node.type !== "root") return [];

  const results: CheckboxItem[] = [];
  for (const child of node.children || []) {
    if (child.type === "list") {
      results.push(...collectCheckboxes(child, content, depth));
      continue;
    }
    if (child.type !== "listItem") continue;
    const listItem = child as ListItem;
    if (listItem.checked === null || listItem.checked === undefined) continue;

    const text = getListItemText(listItem);
    const pos = listItem.position!;
    const start = pos.start.offset!;
    const end = pos.end.offset!;
    const slice = content.slice(start, end);
    const m = slice.match(CHECKBOX_MARKER);
    if (!m) continue;

    results.push({
      text,
      checked: listItem.checked!,
      hash: shortHash(text + "|depth:" + depth),
      bracketOffset: start + m.index!,
      depth,
    });

    for (const itemChild of listItem.children || []) {
      if (itemChild.type === "list") {
        results.push(...collectCheckboxes(itemChild, content, depth + 1));
      }
    }
  }

  return results;
}

export function parseCheckboxes(content: string): CheckboxItem[] {
  const mdast = unified().use(remarkParse).use(remarkGfm).parse(content);
  return collectCheckboxes(mdast as unknown as Root, content, 0);
}

/**
 * 在 markdown 正文中切换指定 hash 的 checkbox 状态。
 * 使用 remark AST 解析，支持联动子级。
 * 返回切换后的内容，若 hash 未找到返回原 content。
 */
export function toggleCheckboxByHash(content: string, hash: string): string | null {
  const items = parseCheckboxes(content);
  const targetIdx = items.findIndex((t) => t.hash === hash);
  if (targetIdx === -1) return null;

  const target = items[targetIdx];
  const off = target.bracketOffset;
  const bracket = content.slice(off, off + 3);
  const newState = bracket.toLowerCase() === "[x]" ? "[ ]" : "[x]";

  // collect children (items with higher depth until same/lower depth)
  const children: CheckboxItem[] = [];
  for (let i = targetIdx + 1; i < items.length; i++) {
    if (items[i].depth <= target.depth) break;
    children.push(items[i]);
  }

  // replace from bottom to top to keep offsets correct
  const all = [target, ...children].sort((a, b) => b.bracketOffset - a.bracketOffset);

  let current = content;
  for (const item of all) {
    const before = current.slice(0, item.bracketOffset);
    const after = current.slice(item.bracketOffset + 3);
    current = before + newState + after;
  }

  return current;
}

export function buildFrontmatterDoc(metadata: Record<string, unknown>, body: string): string {
  const yamlText = yaml
    .dump(metadata, { lineWidth: -1, quotingType: "'" } as Record<string, unknown>)
    .trimEnd();
  return FM_DELIM + "\n" + yamlText + "\n" + FM_DELIM + "\n\n" + body + "\n";
}
