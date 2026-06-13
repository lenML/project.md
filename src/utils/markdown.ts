import yaml from "js-yaml";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
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

export function parse_checkbox_lines(content: string): CheckboxItem[] {
  const mdast = unified().use(remarkParse).use(remarkGfm).parse(content);
  const results: CheckboxItem[] = [];

  visit(mdast, "listItem", (node: ListItem) => {
    if (node.checked === null || node.checked === undefined) return;

    const text = get_item_text(node);
    const pos = node.position!;
    const start = pos.start.offset!;
    const end = pos.end.offset!;
    const slice = content.slice(start, end);
    const m = slice.match(CHECKBOX_MARKER);
    if (!m) return;

    results.push({
      text,
      checked: node.checked!,
      hash: short_hash(text),
      bracket_offset: start + m.index!,
    });
  });

  return results;
}

export function toggle_checkbox_by_hash(content: string, hash: string): string {
  const items = parse_checkbox_lines(content);
  const target = items.find((t) => t.hash === hash);
  if (!target) return content;

  const off = target.bracket_offset;
  const before = content.slice(0, off);
  const bracket = content.slice(off, off + 3);
  const after = content.slice(off + 3);

  const repl = bracket.toLowerCase() === "[x]" ? "[ ]" : "[x]";
  return before + repl + after;
}