import yaml from "js-yaml";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { ListItem, Paragraph, Text } from "mdast";
import { short_hash } from "./hash.js";

const FM_DELIM = "---";

export interface FrontmatterResult {
  metadata: Record<string, unknown>;
  body: string;
}

export function parse_yaml_frontmatter(content: string): FrontmatterResult | null {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith(FM_DELIM)) return null;

  const end_idx = trimmed.indexOf("\n" + FM_DELIM, 3);
  if (end_idx === -1) return null;

  const yaml_text = trimmed.slice(3, end_idx);
  const body = trimmed.slice(end_idx + 4).trimStart();

  const metadata = yaml.load(yaml_text) as Record<string, unknown>;
  return { metadata, body };
}

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
  bracket_offset: number;
  depth: number;
}

function get_item_text(node: ListItem): string {
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

function collect_checkboxes(
  node: import("mdast").Content | import("mdast").Root,
  content: string,
  depth = 0,
): CheckboxItem[] {
  if (node.type !== "list" && node.type !== "root") return [];

  const results: CheckboxItem[] = [];
  for (const child of node.children || []) {
    // handle nested lists (e.g. list at root level)
    if (child.type === "list") {
      results.push(...collect_checkboxes(child, content, depth));
      continue;
    }
    if (child.type !== "listItem") continue;
    const listItem = child as ListItem;
    if (listItem.checked === null || listItem.checked === undefined) continue;

    const text = get_item_text(listItem);
    const pos = listItem.position!;
    const start = pos.start.offset!;
    const end = pos.end.offset!;
    const slice = content.slice(start, end);
    const m = slice.match(CHECKBOX_MARKER);
    if (!m) continue;

    results.push({
      text,
      checked: listItem.checked!,
      hash: short_hash(text + "|depth:" + depth),
      bracket_offset: start + m.index!,
      depth,
    });

    // recursively collect nested checkboxes
    for (const itemChild of listItem.children || []) {
      if (itemChild.type === "list") {
        results.push(...collect_checkboxes(itemChild, content, depth + 1));
      }
    }
  }

  return results;
}

export function parse_checkbox_lines(content: string): CheckboxItem[] {
  const mdast = unified().use(remarkParse).use(remarkGfm).parse(content);
  return collect_checkboxes(mdast, content, 0);
}

export function toggle_checkbox_by_hash(content: string, hash: string): string {
  const items = parse_checkbox_lines(content);
  const targetIdx = items.findIndex((t) => t.hash === hash);
  if (targetIdx === -1) return content;

  const target = items[targetIdx];
  const off = target.bracket_offset;
  const bracket = content.slice(off, off + 3);
  const newState = bracket.toLowerCase() === "[x]" ? "[ ]" : "[x]";

  // collect children (items with higher depth until same/lower depth)
  const children: CheckboxItem[] = [];
  for (let i = targetIdx + 1; i < items.length; i++) {
    if (items[i].depth <= target.depth) break;
    children.push(items[i]);
  }

  // replace from bottom to top to keep offsets correct
  const all = [target, ...children].sort((a, b) => b.bracket_offset - a.bracket_offset);

  let current = content;
  for (const item of all) {
    const before = current.slice(0, item.bracket_offset);
    const after = current.slice(item.bracket_offset + 3);
    current = before + newState + after;
  }

  return current;
}